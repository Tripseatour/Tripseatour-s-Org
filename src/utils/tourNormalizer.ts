import { Tour, Language, TourItinerary } from '../types';
import { initialTours } from '../data/mockData';

const STANDARD_CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  island: {
    TH: 'ทัวร์เที่ยวเกาะ (Speedboat)',
    EN: 'Island Tour (Speedboat)',
    ZH: '跳岛一日游 (快艇)',
    RU: 'Островной тур (Катер)'
  },
  sunset: {
    TH: 'ล่องเรือยอชท์ชมพระอาทิตย์ตก',
    EN: 'Sunset Catamaran Yacht',
    ZH: '日落帆船双体游艇',
    RU: 'Закат на Яхте-Катамаране'
  },
  yacht: {
    TH: 'เรือยอชท์คาทามารัน',
    EN: 'Luxury Catamaran Yacht',
    ZH: '豪华双体帆船游艇',
    RU: 'Роскошная Яхта-Катамаран'
  },
  eco: {
    TH: 'ปางช้างเชิงอนุรักษ์',
    EN: 'Elephant Sanctuary Eco Tour',
    ZH: '大象生态保护区',
    RU: 'Заповедник Слонов'
  },
  sightseeing: {
    TH: 'เที่ยวรอบเมืองภูเก็ต',
    EN: 'Phuket Sightseeing City Tour',
    ZH: '普吉环岛深度观光',
    RU: 'Обзорный тур по Пхукету'
  }
};

/**
 * Normalizes a list of tours to ensure complete, valid translations for all languages (TH, EN, ZH, RU).
 * Fixes any corrupted or missing language fields from localStorage or older database backups.
 */
export function normalizeTours(toursList: Tour[]): Tour[] {
  if (!Array.isArray(toursList)) {
    return initialTours;
  }
  if (toursList.length === 0) {
    return [];
  }

  const initialMap = new Map<string, Tour>(initialTours.map(t => [t.id, t]));

  return toursList.map((tour) => {
    const defaultTour = initialMap.get(tour.id);

    const fallbackImg = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
    let safeImages: string[] = [];
    if (Array.isArray(tour.images) && tour.images.length > 0) {
      safeImages = tour.images.filter(img => typeof img === 'string' && img.trim().length > 0);
    }
    if (safeImages.length === 0 && (tour as any).image && typeof (tour as any).image === 'string') {
      safeImages = [(tour as any).image];
    }
    if (safeImages.length === 0 && defaultTour?.images && defaultTour.images.length > 0) {
      safeImages = [...defaultTour.images];
    }
    if (safeImages.length === 0) {
      safeImages = [fallbackImg];
    }

    // If it's one of our standard tours, merge with initialTour to ensure full translations
    if (defaultTour) {
      return {
        ...defaultTour,
        ...tour,
        slug: tour.slug || defaultTour.slug || tour.id,
        images: safeImages,
        location: tour.location || defaultTour.location || 'ภูเก็ต (Phuket)',
        rating: Number(tour.rating) || defaultTour.rating || 4.9,
        reviewCount: Number(tour.reviewCount) || defaultTour.reviewCount || 128,
        priceAdult: Number(tour.priceAdult) || defaultTour.priceAdult || 1500,
        priceChild: Number(tour.priceChild) || defaultTour.priceChild || 1000,
        priceInfant: Number(tour.priceInfant) || defaultTour.priceInfant || 0,
        costAdult: tour.costAdult !== undefined ? Number(tour.costAdult) : defaultTour.costAdult,
        costChild: tour.costChild !== undefined ? Number(tour.costChild) : defaultTour.costChild,
        priceForeignAdult: Number(tour.priceForeignAdult) || defaultTour.priceForeignAdult || (Number(tour.priceAdult || defaultTour.priceAdult) + 400),
        priceForeignChild: Number(tour.priceForeignChild) || defaultTour.priceForeignChild || (Number(tour.priceChild || defaultTour.priceChild) + 300),
        costForeignAdult: tour.costForeignAdult !== undefined ? Number(tour.costForeignAdult) : (defaultTour.costForeignAdult ?? (tour.costAdult ? Number(tour.costAdult) + 400 : undefined)),
        costForeignChild: tour.costForeignChild !== undefined ? Number(tour.costForeignChild) : (defaultTour.costForeignChild ?? (tour.costChild ? Number(tour.costChild) + 300 : undefined)),
        originalPriceForeignAdult: Number(tour.originalPriceForeignAdult) || defaultTour.originalPriceForeignAdult || (Number(tour.originalPriceAdult || defaultTour.originalPriceAdult || 0) + 500),
        originalPriceForeignChild: Number(tour.originalPriceForeignChild) || defaultTour.originalPriceForeignChild || (Number(tour.originalPriceChild || defaultTour.originalPriceChild || 0) + 400),
        tags: Array.isArray(tour.tags) && tour.tags.length ? tour.tags : defaultTour.tags,
        title: {
          TH: tour.title?.TH || defaultTour.title.TH,
          EN: (tour.title?.EN && tour.title.EN !== tour.title?.TH) ? tour.title.EN : defaultTour.title.EN,
          ZH: (tour.title?.ZH && tour.title.ZH !== tour.title?.TH && !tour.title.ZH.includes('ถ้ำ')) ? tour.title.ZH : defaultTour.title.ZH,
          RU: (tour.title?.RU && tour.title.RU !== tour.title?.TH && !tour.title.RU.includes('าย')) ? tour.title.RU : defaultTour.title.RU,
        },
        categoryLabel: {
          TH: tour.categoryLabel?.TH || defaultTour.categoryLabel.TH,
          EN: tour.categoryLabel?.EN || defaultTour.categoryLabel.EN,
          ZH: tour.categoryLabel?.ZH || defaultTour.categoryLabel.ZH,
          RU: tour.categoryLabel?.RU || defaultTour.categoryLabel.RU,
        },
        description: {
          TH: tour.description?.TH || defaultTour.description.TH,
          EN: (tour.description?.EN && tour.description.EN !== tour.description?.TH) ? tour.description.EN : defaultTour.description.EN,
          ZH: (tour.description?.ZH && tour.description.ZH !== tour.description?.TH) ? tour.description.ZH : defaultTour.description.ZH,
          RU: (tour.description?.RU && tour.description.RU !== tour.description?.TH) ? tour.description.RU : defaultTour.description.RU,
        },
        duration: {
          TH: tour.duration?.TH || defaultTour.duration.TH,
          EN: tour.duration?.EN || defaultTour.duration.EN,
          ZH: tour.duration?.ZH || defaultTour.duration.ZH,
          RU: tour.duration?.RU || defaultTour.duration.RU,
        },
        highlights: {
          TH: Array.isArray(tour.highlights?.TH) && tour.highlights.TH.length ? tour.highlights.TH : defaultTour.highlights.TH,
          EN: Array.isArray(tour.highlights?.EN) && tour.highlights.EN.length ? tour.highlights.EN : defaultTour.highlights.EN,
          ZH: Array.isArray(tour.highlights?.ZH) && tour.highlights.ZH.length ? tour.highlights.ZH : defaultTour.highlights.ZH,
          RU: Array.isArray(tour.highlights?.RU) && tour.highlights.RU.length ? tour.highlights.RU : defaultTour.highlights.RU,
        },
        included: {
          TH: Array.isArray(tour.included?.TH) && tour.included.TH.length ? tour.included.TH : defaultTour.included.TH,
          EN: Array.isArray(tour.included?.EN) && tour.included.EN.length ? tour.included.EN : defaultTour.included.EN,
          ZH: Array.isArray(tour.included?.ZH) && tour.included.ZH.length ? tour.included.ZH : defaultTour.included.ZH,
          RU: Array.isArray(tour.included?.RU) && tour.included.RU.length ? tour.included.RU : defaultTour.included.RU,
        },
        itinerary: (Array.isArray(tour.itinerary) && tour.itinerary.length) ? tour.itinerary.map((step, idx) => {
          const defaultStep = defaultTour.itinerary?.[idx];
          return {
            time: step.time || defaultStep?.time || '',
            title: {
              TH: step.title?.TH || defaultStep?.title?.TH || '',
              EN: step.title?.EN || defaultStep?.title?.EN || step.title?.TH || '',
              ZH: step.title?.ZH || defaultStep?.title?.ZH || step.title?.EN || step.title?.TH || '',
              RU: step.title?.RU || defaultStep?.title?.RU || step.title?.EN || step.title?.TH || '',
            },
            description: step.description ? {
              TH: step.description?.TH || defaultStep?.description?.TH || '',
              EN: step.description?.EN || defaultStep?.description?.EN || step.description?.TH || '',
              ZH: step.description?.ZH || defaultStep?.description?.ZH || step.description?.EN || step.description?.TH || '',
              RU: step.description?.RU || defaultStep?.description?.RU || step.description?.EN || step.description?.TH || '',
            } : defaultStep?.description
          };
        }) : defaultTour.itinerary
      };
    }

    // Custom tours added by admin
    const catLabels = STANDARD_CATEGORY_LABELS[tour.category] || {
      TH: 'ทัวร์ภูเก็ต',
      EN: 'Phuket Tour',
      ZH: '普吉行程',
      RU: 'Тур на Пхукете'
    };

    const titleTH = (typeof tour.title === 'string') ? tour.title : (tour.title?.TH || 'ทัวร์ภูเก็ต');
    const titleEN = (typeof tour.title === 'object' && tour.title?.EN) ? tour.title.EN : titleTH;
    const titleZH = (typeof tour.title === 'object' && tour.title?.ZH) ? tour.title.ZH : titleEN;
    const titleRU = (typeof tour.title === 'object' && tour.title?.RU) ? tour.title.RU : titleEN;

    const descTH = (typeof tour.description === 'string') ? tour.description : (tour.description?.TH || '');
    const descEN = (typeof tour.description === 'object' && tour.description?.EN) ? tour.description.EN : descTH;
    const descZH = (typeof tour.description === 'object' && tour.description?.ZH) ? tour.description.ZH : descEN;
    const descRU = (typeof tour.description === 'object' && tour.description?.RU) ? tour.description.RU : descEN;

    const durTH = (typeof tour.duration === 'string') ? tour.duration : (tour.duration?.TH || '08:00 - 17:00 น.');
    const durEN = (typeof tour.duration === 'object' && tour.duration?.EN) ? tour.duration.EN : '08:00 AM - 05:00 PM';
    const durZH = (typeof tour.duration === 'object' && tour.duration?.ZH) ? tour.duration.ZH : '08:00 - 17:00';
    const durRU = (typeof tour.duration === 'object' && tour.duration?.RU) ? tour.duration.RU : '08:00 - 17:00';

    return {
      ...tour,
      slug: tour.slug || tour.id,
      images: safeImages,
      location: tour.location || 'ภูเก็ต (Phuket)',
      rating: Number(tour.rating) || 4.9,
      reviewCount: Number(tour.reviewCount) || 88,
      priceAdult: Number(tour.priceAdult) || 1500,
      priceChild: Number(tour.priceChild) || 1000,
      priceInfant: Number(tour.priceInfant) || 0,
      costAdult: tour.costAdult !== undefined ? Number(tour.costAdult) : undefined,
      costChild: tour.costChild !== undefined ? Number(tour.costChild) : undefined,
      priceForeignAdult: Number(tour.priceForeignAdult) || (Number(tour.priceAdult) ? Number(tour.priceAdult) + 400 : 1900),
      priceForeignChild: Number(tour.priceForeignChild) || (Number(tour.priceChild) ? Number(tour.priceChild) + 300 : 1300),
      costForeignAdult: tour.costForeignAdult !== undefined ? Number(tour.costForeignAdult) : (tour.costAdult ? Number(tour.costAdult) + 400 : undefined),
      costForeignChild: tour.costForeignChild !== undefined ? Number(tour.costForeignChild) : (tour.costChild ? Number(tour.costChild) + 300 : undefined),
      originalPriceForeignAdult: Number(tour.originalPriceForeignAdult) || (Number(tour.originalPriceAdult) ? Number(tour.originalPriceAdult) + 500 : undefined),
      originalPriceForeignChild: Number(tour.originalPriceForeignChild) || (Number(tour.originalPriceChild) ? Number(tour.originalPriceChild) + 400 : undefined),
      tags: Array.isArray(tour.tags) && tour.tags.length ? tour.tags : [catLabels.TH, 'Phuket Tour'],
      title: { TH: titleTH, EN: titleEN, ZH: titleZH, RU: titleRU },
      categoryLabel: {
        TH: tour.categoryLabel?.TH || catLabels.TH,
        EN: tour.categoryLabel?.EN || catLabels.EN,
        ZH: tour.categoryLabel?.ZH || catLabels.ZH,
        RU: tour.categoryLabel?.RU || catLabels.RU,
      },
      description: { TH: descTH, EN: descEN, ZH: descZH, RU: descRU },
      duration: { TH: durTH, EN: durEN, ZH: durZH, RU: durRU },
      highlights: {
        TH: Array.isArray(tour.highlights?.TH) ? tour.highlights.TH : [titleTH],
        EN: Array.isArray(tour.highlights?.EN) ? tour.highlights.EN : [titleEN],
        ZH: Array.isArray(tour.highlights?.ZH) ? tour.highlights.ZH : (Array.isArray(tour.highlights?.EN) ? tour.highlights.EN : [titleZH]),
        RU: Array.isArray(tour.highlights?.RU) ? tour.highlights.RU : (Array.isArray(tour.highlights?.EN) ? tour.highlights.EN : [titleRU]),
      },
      included: {
        TH: Array.isArray(tour.included?.TH) ? tour.included.TH : [],
        EN: Array.isArray(tour.included?.EN) ? tour.included.EN : (Array.isArray(tour.included?.TH) ? tour.included.TH : []),
        ZH: Array.isArray(tour.included?.ZH) ? tour.included.ZH : (Array.isArray(tour.included?.EN) ? tour.included.EN : []),
        RU: Array.isArray(tour.included?.RU) ? tour.included.RU : (Array.isArray(tour.included?.EN) ? tour.included.EN : []),
      },
      itinerary: Array.isArray(tour.itinerary) ? tour.itinerary.map((step: TourItinerary) => ({
        time: step.time || '',
        title: {
          TH: (typeof step.title === 'string') ? step.title : (step.title?.TH || ''),
          EN: (typeof step.title === 'object' && step.title?.EN) ? step.title.EN : ((typeof step.title === 'string') ? step.title : (step.title?.TH || '')),
          ZH: (typeof step.title === 'object' && step.title?.ZH) ? step.title.ZH : ((typeof step.title === 'object' && step.title?.EN) ? step.title.EN : (step.title?.TH || '')),
          RU: (typeof step.title === 'object' && step.title?.RU) ? step.title.RU : ((typeof step.title === 'object' && step.title?.EN) ? step.title.EN : (step.title?.TH || '')),
        },
        description: step.description ? {
          TH: (typeof step.description === 'string') ? step.description : (step.description?.TH || ''),
          EN: (typeof step.description === 'object' && step.description?.EN) ? step.description.EN : ((typeof step.description === 'string') ? step.description : (step.description?.TH || '')),
          ZH: (typeof step.description === 'object' && step.description?.ZH) ? step.description.ZH : ((typeof step.description === 'object' && step.description?.EN) ? step.description.EN : (step.description?.TH || '')),
          RU: (typeof step.description === 'object' && step.description?.RU) ? step.description.RU : ((typeof step.description === 'object' && step.description?.EN) ? step.description.EN : (step.description?.TH || '')),
        } : undefined
      })) : []
    };
  });
}

/**
 * Returns adult and child pricing according to language or foreigner flag
 */
export function getTourPrice(tour: Tour, isForeigner: boolean = false) {
  const adult = isForeigner && tour.priceForeignAdult ? tour.priceForeignAdult : tour.priceAdult;
  const child = isForeigner && tour.priceForeignChild ? tour.priceForeignChild : tour.priceChild;
  const originalAdult = isForeigner && tour.originalPriceForeignAdult ? tour.originalPriceForeignAdult : tour.originalPriceAdult;
  const originalChild = isForeigner && tour.originalPriceForeignChild ? tour.originalPriceForeignChild : tour.originalPriceChild;
  return { adult, child, originalAdult, originalChild };
}
