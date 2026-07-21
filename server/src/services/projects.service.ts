import prisma from './database.service.js';
import { TestFlow, ProjectConfig, FlowNode, FlowEdge } from '../types/index.js';
import { ProjectMemberRole } from '../generated/prisma/client.js';

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
  createdAt: Date;
  updatedAt: Date;
  members?: Array<{
    id: string;
    userId: string;
    role: ProjectMemberRole;
    user: { id: string; email: string; name: string | null };
  }>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  config?: ProjectConfig;
  newOwnerId?: string;  // Transfer ownership to another user
}

/**
 * Servicio para gestionar proyectos/flujos en la base de datos
 */
export class ProjectsService {

  /**
   * Obtiene todos los proyectos visibles para un usuario.
   * Admin ve todos; user solo ve donde es miembro.
   */
  async findAll(userId: string, isAdmin: boolean): Promise<ProjectDTO[]> {
    const where = isAdmin
      ? undefined
      : {
          members: {
            some: { userId },
          },
        };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    return projects.map(this.mapToDTO);
  }

  /**
   * Obtiene un proyecto por ID si el usuario tiene acceso.
   */
  async findById(id: string, userId: string, isAdmin: boolean): Promise<ProjectDTO | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!project) return null;
    if (!isAdmin && !project.members.some((m) => m.userId === userId)) {
      return null;
    }

    return this.mapToDTO(project);
  }

  /**
   * Crea un nuevo proyecto y asigna al creador como OWNER.
   */
  async create(input: CreateProjectInput, userId: string): Promise<ProjectDTO> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        nodes: JSON.stringify(input.nodes),
        edges: JSON.stringify(input.edges),
        config: input.config ? JSON.stringify(input.config) : null,
        members: {
          create: {
            userId,
            role: ProjectMemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    return this.mapToDTO(project);
  }

  /**
   * Actualiza un proyecto existente.
   */
  async update(
    id: string,
    input: UpdateProjectInput,
    userId: string,
    isAdmin: boolean
  ): Promise<ProjectDTO | null> {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!existing) return null;

    if (!isAdmin && !existing.members.some((m) => m.userId === userId && m.role === ProjectMemberRole.OWNER)) {
      throw new Error("Don't have permission to update this project");
    }

    // Handle ownership transfer if requested
    if (input.newOwnerId) {
      // Verify new owner exists
      const newOwner = await prisma.user.findUnique({ where: { id: input.newOwnerId } });
      if (!newOwner) {
        throw new Error('New owner does not exist');
      }

      // Find current owner and demote to MEMBER
      const currentOwner = existing.members.find(m => m.role === ProjectMemberRole.OWNER);
      if (currentOwner && currentOwner.userId !== input.newOwnerId) {
        await prisma.projectMember.update({
          where: { id: currentOwner.id },
          data: { role: ProjectMemberRole.MEMBER },
        });
      }

      // Check if new owner is already a member
      const existingMember = existing.members.find(m => m.userId === input.newOwnerId);
      if (existingMember) {
        // Promote to OWNER
        await prisma.projectMember.update({
          where: { id: existingMember.id },
          data: { role: ProjectMemberRole.OWNER },
        });
      } else {
        // Add as new OWNER
        await prisma.projectMember.create({
          data: {
            projectId: id,
            userId: input.newOwnerId,
            role: ProjectMemberRole.OWNER,
          },
        });
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        nodes: input.nodes ? JSON.stringify(input.nodes) : undefined,
        edges: input.edges ? JSON.stringify(input.edges) : undefined,
        config: input.config ? JSON.stringify(input.config) : undefined,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    return this.mapToDTO(project);
  }

  /**
   * Elimina un proyecto.
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!existing) return false;

    if (!isAdmin && !existing.members.some((m) => m.userId === userId && m.role === ProjectMemberRole.OWNER)) {
      throw new Error("Don't have permission to delete this project");
    }

    try {
      await prisma.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Guarda o actualiza un  desde un TestFlow.
   */
  async saveFromFlow(flow: TestFlow, userId: string): Promise<ProjectDTO> {
    const existing = await prisma.project.findUnique({
      where: { id: flow.id },
      include: { members: true },
    });

    if (existing) {
      // Verificar permiso de edición
      const isOwner = existing.members.some(
        (m) => m.userId === userId && m.role === ProjectMemberRole.OWNER
      );
      if (!isOwner) {
        throw new Error("Don't have permission to update this project");
      }
      return this.update(flow.id, {
        name: flow.name,
        nodes: flow.nodes,
        edges: flow.edges,
        config: flow.config,
      }, userId, false) as Promise<ProjectDTO>;
    }

    return this.create(
      {
        name: flow.name,
        nodes: flow.nodes,
        edges: flow.edges,
        config: flow.config,
      },
      userId
    );
  }

  /**
   * Convierte un proyecto de la DB a un TestFlow.
   */
  async toTestFlow(id: string, userId: string, isAdmin: boolean): Promise<TestFlow | null> {
    const project = await this.findById(id, userId, isAdmin);
    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      nodes: project.nodes,
      edges: project.edges,
      config: project.config,
    };
  }

  /**
   * Mapea un registro de la DB a un DTO.
   */
  private mapToDTO(project: {
    id: string;
    name: string;
    description: string | null;
    nodes: string;
    edges: string;
    config: string | null;
    createdAt: Date;
    updatedAt: Date;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members?: any[];
  }): ProjectDTO {
    const base: ProjectDTO = {
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      nodes: JSON.parse(project.nodes) as FlowNode[],
      edges: JSON.parse(project.edges) as FlowEdge[],
      config: project.config ? (JSON.parse(project.config) as ProjectConfig) : undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    if (project.members) {
      base.members = project.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      }));
    }

    return base;
  }
}

export const projectsService = new ProjectsService();
