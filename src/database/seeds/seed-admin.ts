import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { AppDataSource } from '../../config/data-source';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../modules/users/entities/user.entity';

config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@prestige-immobilier.sn';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD est requis (variable d\'environnement)');
    process.exit(1);
  }

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOneBy({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`⚠️  Un admin existe déjà : ${ADMIN_EMAIL}`);
    await AppDataSource.destroy();
    return;
  }

  await userRepo.save(
    userRepo.create({
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
      firstName: 'Admin',
      lastName: 'Système',
      role: Role.ADMIN,
    }),
  );

  console.log(`✅ Admin créé : ${ADMIN_EMAIL}`);
  await AppDataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Échec :', err);
  process.exit(1);
});
