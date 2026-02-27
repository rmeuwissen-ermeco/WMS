const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@wms.local";
  const adminPass = "admin123!"; // DEV ONLY

  const passwordHash = await bcrypt.hash(adminPass, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, role: "admin" },
  });

  await prisma.product.upsert({
    where: { sku: "DEMO-SKU-001" },
    update: {},
    create: {
      sku: "DEMO-SKU-001",
      name: "Demo product",
      ean: "0000000000001",
      trackSerial: false,
      balance: { create: { onHand: 0, reserved: 0 } },
    },
  });

  console.log("Seed OK:", adminEmail, "DEMO-SKU-001");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
