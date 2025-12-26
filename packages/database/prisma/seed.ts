import "dotenv/config";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Creating admin user...");

  // Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo",
      plan: "FREE",
      locale: "KO",
    },
  });
  console.log("Organization created:", org.slug);

  // Create User
  const user = await prisma.user.upsert({
    where: { email: "admin@sori.io" },
    update: {},
    create: {
      email: "admin@sori.io",
      name: "Admin",
      emailVerified: true,
      role: "OWNER",
      organizationId: org.id,
    },
  });
  console.log("User created:", user.email);

  // Create Account with password
  const hashedPassword = await hashPassword("admin1234");
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credential",
        providerAccountId: user.id,
      },
    },
    update: {},
    create: {
      provider: "credential",
      providerAccountId: user.id,
      userId: user.id,
      accessToken: hashedPassword,
    },
  });
  console.log("Account created with password");

  // Create Demo Project
  const project = await prisma.project.upsert({
    where: { id: "demo-project" },
    update: {},
    create: {
      id: "demo-project",
      name: "Demo Project",
      organizationId: org.id,
      allowedOrigins: ["http://localhost:3000"],
    },
  });
  console.log("Project created:", project.name);

  console.log("\n✅ Seed completed!");
  console.log("Login with: admin@sori.io / admin1234");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
