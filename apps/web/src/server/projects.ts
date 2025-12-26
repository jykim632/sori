import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@sori/database";

export const getProjects = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId?: string }) => d)
  .handler(async ({ data }) => {
    const where = data?.organizationId
      ? { organizationId: data.organizationId }
      : {};
    return await prisma.project.findMany({
      where,
      include: { organization: true },
    });
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      organizationId: string;
      allowedOrigins?: string[];
    }) => d
  )
  .handler(async ({ data }) => {
    return await prisma.project.create({
      data: {
        name: data.name,
        organizationId: data.organizationId,
        allowedOrigins: data.allowedOrigins || [],
      },
    });
  });

export const getProjectById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.project.findUnique({
      where: { id: data.id },
      include: { organization: true },
    });
  });
