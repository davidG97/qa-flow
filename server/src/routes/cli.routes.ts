import { Router, Request, Response } from 'express';
import { FlowExecutor } from '../services/executor.service.js';
import { ReporterService } from '../services/reporter.service.js';
import { TestFlow, FlowNode, FlowEdge, ProjectConfig } from '../types/index.js';
import prisma from '../services/database.service.js';
import { requireAuthOrPat } from '../middleware/auth.middleware.js';
import { UserRole } from '../generated/prisma/client.js';

const router = Router();

// All CLI routes require authentication (JWT or PAT)
router.use(requireAuthOrPat);

/**
 * Helper to check if user has access to a project
 */
async function userHasAccess(projectId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

/**
 * Helper to fetch a flow from the database by project ID
 */
async function getFlowById(flowId: string): Promise<TestFlow | null> {
  const project = await prisma.project.findUnique({
    where: { id: flowId },
  });

  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    nodes: JSON.parse(project.nodes as string) as FlowNode[],
    edges: JSON.parse(project.edges as string) as FlowEdge[],
    config: project.config ? JSON.parse(project.config as string) as ProjectConfig : undefined,
  };
}

/**
 * POST /cli/run
 * Runs a flow using the same executor as the UI (synchronous for CLI)
 * 
 * Body:
 * - flowId: string (project ID to fetch from DB)
 * - flow: TestFlow (direct flow object - alternative to flowId)
 * 
 * Either flowId or flow must be provided
 */
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const { flowId, flow: directFlow } = req.body as { 
      flowId?: string;
      flow?: TestFlow; 
    };
    
    const userId = req.userId!;
    const isAdmin = req.userRole === UserRole.ADMIN;
    
    let flow: TestFlow | null = directFlow || null;
    
    // If flowId provided, fetch from database
    if (flowId && !flow) {
      // Check access before fetching
      const hasAccess = await userHasAccess(flowId, userId, isAdmin);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this flow',
        });
        return;
      }
      
      flow = await getFlowById(flowId);
      if (!flow) {
        res.status(404).json({
          success: false,
          error: `Flow not found with ID: ${flowId}`,
        });
        return;
      }
    }
    
    if (!flow?.nodes || !flow?.edges) {
      res.status(400).json({
        success: false,
        error: 'Either flowId or a valid flow object with nodes and edges is required',
      });
      return;
    }

    console.log(`🚀 [CLI] Starting execution for flow: ${flow.name || flow.id}`);
    const startTime = Date.now();
    
    // ponytail: CLI runs headless, no slowMo needed
    const executor = new FlowExecutor({
      slowMo: 0,
      timeout: flow.config?.timeout ?? 30000,
    });

    // Execute synchronously (wait for completion)
    const finalStatus = await executor.execute(flow);
    const duration = Date.now() - startTime;
    
    // Generate report
    let reportId: string | undefined;
    try {
      const report = ReporterService.generateReport(executor.getExecutionId(), finalStatus, flow);
      reportId = report.id;
      console.log(`📊 [CLI] Report generated: ${reportId}`);
    } catch (reportError) {
      console.error('[CLI] Error generating report:', reportError);
    }

    // Calculate stats
    const passed = finalStatus.results.filter(r => r.success).length;
    const failed = finalStatus.results.filter(r => !r.success).length;
    const total = finalStatus.results.length;

    console.log(`✅ [CLI] Execution completed: ${finalStatus.status} (${passed}/${total} passed) in ${duration}ms`);
    
    res.json({
      success: finalStatus.status === 'completed',
      data: {
        executionId: executor.getExecutionId(),
        status: finalStatus.status,
        duration,
        flowId: flow.id,
        flowName: flow.name,
        reportId,
        stats: {
          total,
          passed,
          failed,
        },
        results: finalStatus.results.map(r => ({
          nodeId: r.nodeId,
          nodeType: r.nodeType,
          success: r.success,
          message: r.message,
          error: r.error,
          duration: r.duration,
          screenshot: r.screenshot,
        })),
        error: finalStatus.error,
      },
    });
  } catch (error) {
    console.error('[CLI] Error running flow:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error running test',
    });
  }
});

/**
 * GET /cli/flows
 * Lists available flows (projects) that can be executed.
 * Admin sees all; regular users see only their projects.
 */
router.get('/flows', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const isAdmin = req.userRole === UserRole.ADMIN;
    
    // Admin sees all, users see only their projects
    const where = isAdmin
      ? undefined
      : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: projects.map(p => ({
        flowId: p.id,
        name: p.name,
        description: p.description,
        lastUpdated: p.updatedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error listing flows',
    });
  }
});

// ponytail: reports endpoints live at /api/reports, no duplication here

export default router;
