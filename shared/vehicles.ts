/**
 * Configuration des véhicules Mercedes disponibles
 * Inclut les images CDN, caractéristiques et tarification
 */

export const VEHICLES = {
  CLASSE_E: {
    id: "classe-e",
    name: "Mercedes Classe E",
    category: "Berline Premium",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-e-class_75738ea1.jpg",
    images: [
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-e-class_75738ea1.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-e_b46d5dc9.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Mercedes-Benz_W213_E200_AMG_Line_2016_%2821178432028%29.jpg/1280px-Mercedes-Benz_W213_E200_AMG_Line_2016_%2821178432028%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/2021_Mercedes-Benz_E_220d_AMG_Line_Night_Edition_Premium_Plus_%28W213%29_2.0_Rear_%28cropped%29.jpg/1280px-2021_Mercedes-Benz_E_220d_AMG_Line_Night_Edition_Premium_Plus_%28W213%29_2.0_Rear_%28cropped%29.jpg",
    ],
    description: "Berline élégante et confortable, idéale pour les trajets professionnels et les déplacements en ville.",
    features: [
      "Confort et élégance",
      "Technologie avancée",
      "Consommation optimisée",
      "Capacité: 4 passagers",
      "Coffre spacieux"
    ],
    pricePerKm: 3.0, // EUR par km
    pricePerHour: 85, // EUR par heure avec chauffeur
    minDistance: 10, // km minimum
  },
  CLASSE_S: {
    id: "classe-s",
    name: "Mercedes Classe S",
    category: "Berline Ultra-Premium",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-s-class_eb865da1.jpg",
    images: [
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-s-class_eb865da1.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-s_23596992.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/2021_Mercedes-Benz_S_Class_W223_in_Obsidian_Black%2C_Front_8.27.21.jpg/1280px-2021_Mercedes-Benz_S_Class_W223_in_Obsidian_Black%2C_Front_8.27.21.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Mercedes-Benz_S-Class_%28W222%29_rear_8.27.21.jpg/1280px-Mercedes-Benz_S-Class_%28W222%29_rear_8.27.21.jpg",
    ],
    description: "Berline de luxe suprême, offrant le nec plus ultra en matière de confort, de technologie et de prestige.",
    features: [
      "Luxe et prestige",
      "Technologie haut de gamme",
      "Confort exceptionnel",
      "Capacité: 4 passagers",
      "Équipements premium"
    ],
    pricePerKm: 4.0, // EUR par km
    pricePerHour: 120, // EUR par heure avec chauffeur
    minDistance: 10, // km minimum
  },
  CLASSE_V: {
    id: "classe-v",
    name: "Mercedes Classe V",
    category: "Monospace Premium",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-v-class_b78a2771.jpg",
    images: [
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-v-class_b78a2771.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-v_1ead2414.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/2019_Mercedes-Benz_V-Class_%28W447%29_250d_AMG_Line_Long_automatic_%2820190817%29_%28cropped%29.jpg/1280px-2019_Mercedes-Benz_V-Class_%28W447%29_250d_AMG_Line_Long_automatic_%2820190817%29_%28cropped%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/2016_Mercedes-Benz_V250_AMG_Line_%28W447%29_%2820160730%29_%28cropped%29.jpg/1280px-2016_Mercedes-Benz_V250_AMG_Line_%28W447%29_%2820160730%29_%28cropped%29.jpg",
    ],
    description: "Monospace haut de gamme conçu pour les groupes, les familles ou les événements spéciaux avec chauffeur.",
    features: [
      "Espace et flexibilité",
      "Capacité: 7 passagers",
      "Intérieur modulable",
      "Confort premium",
      "Idéal pour groupes"
    ],
    pricePerKm: 3.5, // EUR par km
    pricePerHour: 95, // EUR par heure avec chauffeur
    minDistance: 15, // km minimum
  },
} as const;

export type VehicleId = keyof typeof VEHICLES;

export function getVehicleById(id: string) {
  return Object.values(VEHICLES).find(v => v.id === id);
}

export function getAllVehicles() {
  return Object.values(VEHICLES);
}

/**
 * Calcule le prix d'un trajet en fonction de la distance et du véhicule
 */
export function calculateQuotePrice(vehicleId: string, distanceKm: number): number | null {
  const vehicle = getVehicleById(vehicleId);
  if (!vehicle) return null;
  
  const distancePrice = Math.max(distanceKm, vehicle.minDistance) * vehicle.pricePerKm;
  return Math.round(Math.max(distancePrice, vehicle.pricePerHour) * 100) / 100;
}

/**
 * Calcule le prix d'une mise à disposition horaire
 */
export function calculateDisposalPrice(vehicleId: string, hours: number): number | null {
  const vehicle = getVehicleById(vehicleId);
  if (!vehicle) return null;
  
  return Math.round(hours * vehicle.pricePerHour * 100) / 100;
}
