import { ArchdeaconryModel } from '../models/Archdeaconry';
import { connectDB } from '../config/db';

const archdeaconries = [
  {
    archdeaconryId: 'accra-east',
    name: 'Accra East',
    center: [5.602, -0.13],
    zoom: 12,
    branches: 10,
    members: 1250,
    parishes: [
      {
        id: 'e1',
        name: 'St. Peter',
        location: 'Nungua',
        coordinates: [5.6, -0.076],
        isOutstation: false,
      },
      {
        id: 'e2',
        name: 'St. Augustine',
        location: 'Nungua North',
        coordinates: [5.613, -0.079],
        isOutstation: false,
      },
      {
        id: 'e3',
        name: 'Messiah',
        location: 'Nungua South',
        coordinates: [5.59, -0.081],
        isOutstation: false,
      },
      {
        id: 'e4',
        name: 'St. James',
        location: 'Teshie North',
        coordinates: [5.605, -0.101],
        isOutstation: false,
      },
      {
        id: 'e5',
        name: 'St. Bartholomew',
        location: 'Teshie',
        coordinates: [5.586, -0.103],
        isOutstation: false,
      },
      {
        id: 'e6',
        name: "St. George's",
        location: 'Burma Camp',
        coordinates: [5.601, -0.145],
        isOutstation: false,
      },
      {
        id: 'e7',
        name: 'St. Paul',
        location: 'La',
        coordinates: [5.568, -0.155],
        isOutstation: false,
      },
      {
        id: 'e8',
        name: 'St. Barnabas',
        location: 'Osu',
        coordinates: [5.555, -0.181],
        isOutstation: false,
      },
      {
        id: 'e9',
        name: 'St. Timothy',
        location: 'Nima',
        coordinates: [5.587, -0.193],
        isOutstation: false,
      },
      {
        id: 'e10',
        name: 'Holy Gabriel',
        location: 'Kotobabi',
        coordinates: [5.599, -0.203],
        isOutstation: false,
      },
    ],
  },

  {
    archdeaconryId: 'accra-north-west',
    name: 'Accra North West',
    center: [5.642, -0.32],
    zoom: 11,
    branches: 17,
    members: 1840,
    parishes: [
      {
        id: 'nw1',
        name: 'St Luke Anglican Church',
        location: 'Kwashieman',
        coordinates: [5.598, -0.263],
        isOutstation: false,
      },
      {
        id: 'nw2',
        name: 'Christ the King',
        location: 'Mallam-Gbawe',
        coordinates: [5.582, -0.301],
        isOutstation: false,
      },
      {
        id: 'nw3',
        name: 'St Justin',
        location: 'Ablekuma',
        coordinates: [5.617, -0.316],
        isOutstation: false,
      },
      {
        id: 'nw4',
        name: 'St Jerome',
        location: 'Amammorley',
        coordinates: [5.67, -0.286],
        isOutstation: false,
      },
      {
        id: 'nw5',
        name: 'St Patrick',
        location: 'Jei Krodua',
        coordinates: [5.541, -0.428],
        isOutstation: false,
      },
      {
        id: 'nw6',
        name: 'St Mary Magdalene',
        location: 'Medie',
        coordinates: [5.728, -0.334],
        isOutstation: false,
      },
      {
        id: 'nw7',
        name: 'Church of Resurrection',
        coordinates: [5.62, -0.29],
        isOutstation: true,
      },
      {
        id: 'nw8',
        name: 'Nativity Church',
        location: 'Onyansana',
        coordinates: [5.632, -0.305],
        isOutstation: true,
      },
      {
        id: 'nw9',
        name: 'Church of Epiphany',
        location: 'Opah',
        coordinates: [5.645, -0.318],
        isOutstation: true,
      },
      {
        id: 'nw10',
        name: 'Holy Innocent',
        location: 'Oduman',
        coordinates: [5.611, -0.338],
        isOutstation: true,
      },
      {
        id: 'nw11',
        name: 'Holy Paraclete',
        location: 'Nsakina',
        coordinates: [5.635, -0.355],
        isOutstation: true,
      },
      {
        id: 'nw12',
        name: 'St Barnabas',
        location: 'Ashaladza',
        coordinates: [5.658, -0.37],
        isOutstation: true,
      },
      {
        id: 'nw13',
        name: 'St Cyprian',
        location: 'Obeyeyie',
        coordinates: [5.688, -0.358],
        isOutstation: true,
      },
      {
        id: 'nw14',
        name: 'St Francis of Assisi',
        location: 'Ayikai Doblo',
        coordinates: [5.7, -0.375],
        isOutstation: true,
      },
      {
        id: 'nw15',
        name: 'St Mark',
        location: 'Ardeyman',
        coordinates: [5.715, -0.34],
        isOutstation: true,
      },
      {
        id: 'nw16',
        name: 'St Mary',
        location: 'Ayawaso',
        coordinates: [5.735, -0.31],
        isOutstation: true,
      },
      {
        id: 'nw17',
        name: 'St Thomas',
        coordinates: [5.6, -0.38],
        isOutstation: true,
      },
    ],
  },

  {
    archdeaconryId: 'accra-north',
    name: 'Accra North',
    center: [5.589, -0.231],
    zoom: 13,
    branches: 7,
    members: 1420,
    parishes: [
      {
        id: 'n1',
        name: 'St. Andrew',
        location: 'Abossey Okai',
        coordinates: [5.564, -0.231],
        isOutstation: false,
      },
      {
        id: 'n2',
        name: 'St. Joseph the Worker',
        location: 'Bubiashie',
        coordinates: [5.578, -0.245],
        isOutstation: false,
      },
      {
        id: 'n3',
        name: 'St. Monica',
        location: 'Kaneshie',
        coordinates: [5.575, -0.235],
        isOutstation: false,
      },
      {
        id: 'n4',
        name: 'All Saints',
        location: 'Adabraka',
        coordinates: [5.56, -0.207],
        isOutstation: false,
      },
      {
        id: 'n5',
        name: 'St. Cecilia',
        location: 'Kpehe',
        coordinates: [5.582, -0.215],
        isOutstation: false,
      },
      {
        id: 'n6',
        name: 'St. Anthony',
        location: 'Abelenkpe',
        coordinates: [5.605, -0.202],
        isOutstation: false,
      },
      {
        id: 'n7',
        name: 'St. Anne',
        location: 'Abeka',
        coordinates: [5.597, -0.235],
        isOutstation: false,
      },
    ],
  },

  {
    archdeaconryId: 'accra-west',
    name: 'Accra West',
    center: [5.548, -0.252],
    zoom: 12,
    branches: 11,
    members: 1950,
    parishes: [
      {
        id: 'w1',
        name: 'St. Mary',
        location: 'Akoto Lante',
        coordinates: [5.539, -0.213],
        isOutstation: false,
      },
      {
        id: 'w2',
        name: 'St. Michael',
        location: 'Korle Gonno',
        coordinates: [5.531, -0.224],
        isOutstation: false,
      },
      {
        id: 'w3',
        name: 'St. Francis',
        location: 'Mamprobi',
        coordinates: [5.533, -0.245],
        isOutstation: false,
      },
      {
        id: 'w4',
        name: 'St. George',
        location: 'Chorkor',
        coordinates: [5.529, -0.255],
        isOutstation: false,
      },
      {
        id: 'w5',
        name: 'All Souls',
        location: 'Agege',
        coordinates: [5.535, -0.265],
        isOutstation: false,
      },
      {
        id: 'w6',
        name: 'Holy Spirit',
        location: 'Lartebiokorshie',
        coordinates: [5.545, -0.235],
        isOutstation: false,
      },
      {
        id: 'w7',
        name: 'St. Augustine',
        location: 'Dansoman',
        coordinates: [5.542, -0.275],
        isOutstation: false,
      },
      {
        id: 'w8',
        name: 'St. John',
        location: 'Odorkor',
        coordinates: [5.565, -0.268],
        isOutstation: false,
      },
      {
        id: 'w9',
        name: 'St. James',
        location: 'Anaya',
        coordinates: [5.56, -0.285],
        isOutstation: false,
      },
      {
        id: 'w10',
        name: 'St. Matthew',
        location: 'New Bortianor',
        coordinates: [5.53, -0.325],
        isOutstation: false,
      },
      {
        id: 'w11',
        name: 'Sacred Heart',
        location: 'Amasaman',
        coordinates: [5.702, -0.301],
        isOutstation: false,
      },
    ],
  },

  {
    archdeaconryId: 'accra-north-east',
    name: 'Accra North East',
    center: [5.688, -0.165],
    zoom: 12,
    branches: 12,
    members: 2100,
    parishes: [
      {
        id: 'ne1',
        name: 'St. Peter',
        location: 'Madina',
        coordinates: [5.673, -0.165],
        isOutstation: false,
      },
      {
        id: 'ne2',
        name: 'Ascension',
        location: 'Ashaley Botwe',
        coordinates: [5.689, -0.142],
        isOutstation: false,
      },
      {
        id: 'ne3',
        name: 'Holy Family',
        location: 'Adenta',
        coordinates: [5.7, -0.162],
        isOutstation: false,
      },
      {
        id: 'ne4',
        name: 'Transfiguration',
        location: 'Haatso',
        coordinates: [5.66, -0.192],
        isOutstation: false,
      },
      {
        id: 'ne5',
        name: 'St. Ambrose',
        location: 'Dome',
        coordinates: [5.642, -0.215],
        isOutstation: false,
      },
      {
        id: 'ne6',
        name: 'St. Benedict',
        location: 'Ashongman',
        coordinates: [5.685, -0.21],
        isOutstation: false,
      },
      {
        id: 'ne7',
        name: 'Transfiguration',
        location: 'Oyibi',
        coordinates: [5.785, -0.115],
        isOutstation: false,
      },
      {
        id: 'ne8',
        name: 'SS Peter and Paul',
        location: 'Atomic, Kwabenya',
        coordinates: [5.665, -0.212],
        isOutstation: false,
      },
      {
        id: 'ne9',
        name: 'St. Christopher',
        location: 'Otinibi',
        coordinates: [5.74, -0.155],
        isOutstation: false,
      },
      {
        id: 'ne10',
        name: 'St. John',
        location: 'Kwabenya Aboum',
        coordinates: [5.68, -0.235],
        isOutstation: false,
      },
      {
        id: 'ne11',
        name: 'St. Philip',
        location: 'Ashaley Botwe',
        coordinates: [5.682, -0.148],
        isOutstation: false,
      },
      {
        id: 'ne12',
        name: 'St. Joseph',
        location: 'Agbogba',
        coordinates: [5.675, -0.188],
        isOutstation: false,
      },
    ],
  },

  {
    archdeaconryId: 'cathedral-deanery',
    name: 'Cathedral Deanery',
    center: [5.545, -0.203],
    zoom: 14,
    branches: 1,
    members: 3000,
    parishes: [
      {
        id: 'cd1',
        name: 'Holy Trinity Cathedral',
        location: 'Accra Central',
        coordinates: [5.545, -0.203],
        isOutstation: false,
      },
    ],
  },
];

const seedArchdeaconries = async () => {
  try {
    await connectDB();

    await ArchdeaconryModel.deleteMany({});

    const inserted = await ArchdeaconryModel.insertMany(archdeaconries);

    console.log(
      `Successfully seeded ${inserted.length} archdeaconries.`,
    );

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed archdeaconries:', error);

    process.exit(1);
  }
};

seedArchdeaconries();