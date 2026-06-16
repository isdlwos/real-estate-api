import { faker } from '@faker-js/faker/locale/fr';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { AppDataSource } from '../../config/data-source';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { Plan } from '../../modules/subscriptions/entities/plan.entity';
import { PropertyCategory } from '../../common/enums/property-category.enum';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { PropertyType } from '../../common/enums/property-type.enum';
import { Role } from '../../common/enums/role.enum';
import { Appointment } from '../../modules/appointments/entities/appointment.entity';
import { Property } from '../../modules/properties/entities/property.entity';
import { PropertyImage } from '../../modules/property-images/entities/property-image.entity';
import { Agent } from '../../modules/users/entities/agent.entity';
import { User } from '../../modules/users/entities/user.entity';

const IMAGES_BY_CATEGORY: Record<string, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
  ],
  house: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
  ],
};

config();

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Starting seed...');

  const userRepo = AppDataSource.getRepository(User);
  const agentRepo = AppDataSource.getRepository(Agent);
  const propertyRepo = AppDataSource.getRepository(Property);
  const propertyImageRepo = AppDataSource.getRepository(PropertyImage);
  const appointmentRepo = AppDataSource.getRepository(Appointment);
  const planRepo = AppDataSource.getRepository(Plan);

  // Plans d'abonnement
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      price: 15000,
      maxListings: 5,
      canBoost: false,
      canFeature: false,
    },
    {
      name: 'Pro',
      slug: 'pro',
      price: 35000,
      maxListings: 20,
      canBoost: true,
      canFeature: false,
    },
    {
      name: 'Agence',
      slug: 'agency',
      price: 75000,
      maxListings: -1,
      canBoost: true,
      canFeature: true,
    },
  ];
  for (const p of plans) {
    const exists = await planRepo.findOneBy({ slug: p.slug });
    if (!exists) {
      await planRepo.save(planRepo.create(p));
    } else {
      await planRepo.update(
        { slug: p.slug },
        { canBoost: p.canBoost, canFeature: p.canFeature },
      );
    }
  }
  console.log("✅ Plans d'abonnement créés/mis à jour");

  // Admin
  let admin = await userRepo.findOneBy({
    email: 'admin@prestige-immobilier.sn',
  });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        email: 'admin@prestige-immobilier.sn',
        password: await bcrypt.hash('Admin1234!', 12),
        firstName: 'Admin',
        lastName: 'Système',
        role: Role.ADMIN,
      }),
    );
    console.log('✅ Admin créé');
  }

  // Agents
  const agentData = [
    {
      email: 'aminata.diallo@prestige-immobilier.sn',
      firstName: 'Aminata',
      lastName: 'Diallo',
    },
    {
      email: 'moussa.ndiaye@prestige-immobilier.sn',
      firstName: 'Moussa',
      lastName: 'Ndiaye',
    },
    {
      email: 'fatou.sow@prestige-immobilier.sn',
      firstName: 'Fatou',
      lastName: 'Sow',
    },
  ];

  const agents: Agent[] = [];
  for (const data of agentData) {
    let user = await userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          ...data,
          email: data.email,
          password: await bcrypt.hash('Agent1234!', 12),
          role: Role.AGENT,
          phone: faker.phone.number(),
        }),
      );
    }
    let agent = await agentRepo.findOneBy({ userId: user.id });
    if (!agent) {
      agent = await agentRepo.save(
        agentRepo.create({
          userId: user.id,
          bio: faker.lorem.sentences(2),
          licenseNumber: `LIC-${faker.string.alphanumeric(8).toUpperCase()}`,
          agency: 'Prestige Immobilier SN',
        }),
      );
    }
    agents.push(agent);
  }
  console.log('✅ 3 agents créés');

  // Client
  let client = await userRepo.findOneBy({ email: 'client@example.sn' });
  if (!client) {
    client = await userRepo.save(
      userRepo.create({
        email: 'client@example.sn',
        password: await bcrypt.hash('Client1234!', 12),
        firstName: 'Ibrahima',
        lastName: 'Fall',
        role: Role.CLIENT,
        phone: faker.phone.number(),
      }),
    );
    console.log('✅ Client de test créé');
  }

  // Properties
  const cities = [
    'Dakar',
    'Saint-Louis',
    'Thiès',
    'Ziguinchor',
    'Kaolack',
    'Mbour',
    'Touba',
    'Diourbel',
    'Tambacounda',
    'Saly',
  ];
  const zipCodes: Record<string, string> = {
    Dakar: '10000',
    'Saint-Louis': '46000',
    Thiès: '21000',
    Ziguinchor: '26000',
    Kaolack: '18000',
    Mbour: '23000',
    Touba: '93000',
    Diourbel: '16000',
    Tambacounda: '51000',
    Saly: '23500',
  };
  const streetPrefixes = [
    'Rue',
    'Avenue',
    'Boulevard',
    'Allée',
    'Cité',
    'Villa',
  ];
  const streetNames = [
    'Léopold Sédar Senghor',
    'Cheikh Anta Diop',
    'Blaise Diagne',
    'El Hadj Malick Sy',
    'Lat Dior',
    'Mamadou Dia',
    'de la Corniche',
    'du Port',
    'des Almadies',
    'Serigne Touba',
  ];
  const categories = Object.values(PropertyCategory);
  const types = Object.values(PropertyType);

  const existingCount = await propertyRepo.count();
  if (existingCount < 10) {
    for (let i = 0; i < 10; i++) {
      const agent = agents[i % agents.length];
      const category = faker.helpers.arrayElement(categories);
      const city = faker.helpers.arrayElement(cities);
      const property = await propertyRepo.save(
        propertyRepo.create({
          title: faker.helpers.arrayElement([
            'Bel appartement lumineux à Dakar',
            'Villa familiale avec jardin',
            'Studio moderne centre-ville',
            'Appartement rénové vue mer',
            'Villa prestige avec piscine',
            'Duplex calme et spacieux',
            'Terrain constructible viabilisé',
            'Local commercial bien situé',
          ]),
          description: faker.lorem.paragraphs(2),
          price: faker.number.int({ min: 10000000, max: 500000000 }),
          type: faker.helpers.arrayElement(types),
          category,
          status: PropertyStatus.AVAILABLE,
          surface: faker.number.int({ min: 25, max: 500 }),
          rooms: faker.number.int({ min: 1, max: 8 }),
          bedrooms: faker.number.int({ min: 1, max: 5 }),
          bathrooms: faker.number.int({ min: 1, max: 3 }),
          address: `${faker.helpers.arrayElement(streetPrefixes)} ${faker.helpers.arrayElement(streetNames)}, N°${faker.number.int({ min: 1, max: 200 })}`,
          city,
          zipCode: zipCodes[city],
          country: 'Sénégal',
          agentId: agent.id,
          features: {
            parking: faker.datatype.boolean(),
            elevator: faker.datatype.boolean(),
            terrace: faker.datatype.boolean(),
            cellar: faker.datatype.boolean(),
          },
        }),
      );
      await seedImagesForProperty(property, propertyImageRepo);
    }
    console.log('✅ 10 propriétés créées');
  }

  // Add images to existing properties that have none
  const propertiesWithoutImages = await propertyRepo
    .createQueryBuilder('p')
    .leftJoin('p.images', 'img')
    .where('img.id IS NULL')
    .getMany();

  if (propertiesWithoutImages.length > 0) {
    for (const property of propertiesWithoutImages) {
      await seedImagesForProperty(property, propertyImageRepo);
    }
    console.log(
      `✅ Images ajoutées à ${propertiesWithoutImages.length} propriétés existantes`,
    );
  }

  // Appointments
  const properties = await propertyRepo.find({ take: 5 });
  const appointmentCount = await appointmentRepo.count();
  if (appointmentCount < 5) {
    for (let i = 0; i < 5; i++) {
      const property = properties[i % properties.length];
      const agent = agents[i % agents.length];
      const futureDate = faker.date.soon({ days: 30 });
      await appointmentRepo.save(
        appointmentRepo.create({
          propertyId: property.id,
          agentId: agent.id,
          clientId: client.id,
          date: futureDate,
          status: AppointmentStatus.PENDING,
          notes: faker.lorem.sentence(),
        }),
      );
    }
    console.log('✅ 5 rendez-vous créés');
  }

  await AppDataSource.destroy();
  console.log('\n🎉 Seed terminé !');
  console.log('─────────────────────────────────────');
  console.log('Admin     : admin@prestige-immobilier.sn / Admin1234!');
  console.log('Agent 1   : aminata.diallo@prestige-immobilier.sn / Agent1234!');
  console.log('Agent 2   : moussa.ndiaye@prestige-immobilier.sn / Agent1234!');
  console.log('Agent 3   : fatou.sow@prestige-immobilier.sn / Agent1234!');
  console.log('Client    : client@example.sn / Client1234!');
}

async function seedImagesForProperty(
  property: Property,
  imageRepo: import('typeorm').Repository<PropertyImage>,
) {
  const pool =
    IMAGES_BY_CATEGORY[property.category] ?? IMAGES_BY_CATEGORY['house'];
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 2);
  for (let idx = 0; idx < shuffled.length; idx++) {
    await imageRepo.save(
      imageRepo.create({
        propertyId: property.id,
        url: shuffled[idx],
        isPrimary: idx === 0,
      }),
    );
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
