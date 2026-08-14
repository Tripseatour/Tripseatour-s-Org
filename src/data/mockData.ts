import { Tour, Booking, Review, Customer, AppSettings } from '../types';

export const initialTours: Tour[] = [
  {
    id: 'tour-1',
    slug: 'phi-phi-maya-khai-speedboat',
    category: 'island',
    categoryLabel: {
      TH: 'ทัวร์เที่ยวเกาะ (Speedboat)',
      EN: 'Island Tour (Speedboat)',
      ZH: '跳岛一日游 (快艇)',
      RU: 'Островной тур (Катер)'
    },
    title: {
      TH: 'ทัวร์เกาะพีพี มายา ปิเละลากูน & เกาะไข่ โดยเรือสปีดโบ๊ท',
      EN: 'Phi Phi Islands, Maya Bay, Pileh Lagoon & Khai Island Speedboat Tour',
      ZH: '皮皮岛、玛雅湾、皮勒皮水上ถ้ำ与ไข่岛快艇一日游',
      RU: 'Тур на острова Пхи-Пхи, Мая Бей, Лагуна Пиле и о. Кхай'
    },
    description: {
      TH: 'สัมผัสความงดงามระดับโลกของหมู่เกาะพีพี ถ่ายรูปอ่าวมายา เล่นน้ำใสราวกระจกที่ปิเละลากูน ชมถ้ำไวกิ้ง ดำน้ำดูปะการัง และพักผ่อนบนหาดทรายขาวเกาะไข่นก รวมบุฟเฟต์อาหารกลางวัน รถรับส่ง และอุปกรณ์ครบครัน',
      EN: 'Discover world-famous Phi Phi Islands! Swim in emerald crystal waters of Pileh Lagoon, walk on iconic Maya Bay sand beach, visit Viking Cave, snorkel with colorful fish and relax on Khai Island white sand beach. Full lunch buffet & hotel transfers included.',
      ZH: '探索世界闻名的皮皮岛！在皮勒海湾翡翠般晶莹剔透的水中游泳，打卡玛雅湾白沙滩，探秘维京溶洞，深潜观赏彩虹热带鱼，并在鸡蛋岛放松身心。含丰盛自助午餐及酒店接送。',
      RU: 'Исследуйте всемирно известные острова Пхи-Пхи! Купайтесь в бирюзовой лагуне Пиле, прогуляйтесь по легендарному пляжу Мая Бэй, посмотрите пещеру Викингов, насладитесь снорклингом и отдыхом на острове Кхай. Включен обед и трансфер.'
    },
    highlights: {
      TH: ['อ่าวมายา (Maya Bay) ฉากถ่ายทำภาพยนตร์ระดับโลก', 'สระว่ายน้ำธรรมชาติปิเละลากูน (Pileh Lagoon)', 'ดำน้ำดูปะการังน้ำใส และปลาการ์ตูน', 'เกาะไข่นก พักผ่อนบนหาดทรายขาวเนียน'],
      EN: ['Iconic Maya Bay filming spot', 'Emerald green Pileh Lagoon swimming', 'Snorkeling with sea life & corals', 'Relaxing on Khai Island beach'],
      ZH: ['打卡好莱坞电影取景地玛雅湾', '皮勒翡翠水上天然游泳池', '浮潜观赏珊瑚礁与热带鱼群', '鸡蛋岛白沙滩日光浴与休闲'],
      RU: ['Знаменитый пляж Мая Бэй', 'Купание в Изумрудной лагуне Пиле', 'Снорклинг среди кораллов и рыб', 'Белоснежный пляж острова Кхай']
    },
    priceAdult: 1890,
    priceChild: 1390,
    originalPriceAdult: 2800,
    originalPriceChild: 2000,
    duration: {
      TH: '07:30 - 17:30 น. (เต็มวัน 9 ชม.)',
      EN: '07:30 AM - 05:30 PM (Full Day)',
      ZH: '07:30 - 17:30 (全天9小时)',
      RU: '07:30 - 17:30 (Полный день)'
    },
    location: 'Phi Phi Islands, Krabi / Phuket',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Rawai', 'Chalong', 'Kamala', 'Bangtao'],
    included: {
      TH: ['รถรับ-ส่งไปกลับจากโรงแรมในเขตกำหนด', 'เรือสปีดโบ๊ทนำเที่ยวปรับปรุงใหม่พร้อมเสื้อชูชีพ', 'อาหารกลางวันแบบบุฟเฟต์สไตล์ไทยบนเกาะพีพีดอน', 'เครื่องดื่ม น้ำอัดลม ผลไม้สดตลอดทริป', 'หน้ากากดำน้ำ + เสื้อชูชีพ', 'ประกันอุบัติเหตุการเดินทาง', 'ไกด์นำเที่ยวดูแลตลอดทริป'],
      EN: ['Roundtrip hotel transfer (selected zones)', 'Modern speedboat tour with life jackets', 'Buffet lunch on Phi Phi Don Island', 'Soft drinks, water & fresh tropical fruits', 'Snorkeling equipment & life vest', 'Travel accident insurance', 'Professional licensed tour guide'],
      ZH: ['指定区域酒店往返接送', '新型豪华快艇与救生衣', '皮皮岛丰盛自助午餐', '全程软饮、矿泉水与新鲜热带水果', '浮潜面镜、呼吸管与救生衣', '旅游意外保险', '中/英文专业导游全程服务'],
      RU: ['Трансфер из отеля и обратно', 'Современный скоростной катер', 'Обед "шведский стол" на Пхи-Пхи Дон', 'Прохладительные напитки и фрукты', 'Снаряжение для снорклинга', 'Страховка от несчастных случаев', 'Русско/англ лингвистический гид']
    },
    itinerary: [
      { time: '07:30 - 08:30', title: { TH: 'รับจากโรงแรม', EN: 'Hotel Pickup', ZH: '酒店接送', RU: 'Трансфер из отеля' }, description: { TH: 'รถตู้ VIP รับท่านจากโรงแรมเดินทางสู่ท่าเรือ', EN: 'VIP van picks up from hotel to pier', ZH: 'VIP专车从酒店接您前往码头', RU: 'VIP микроавтобус забирает из отеля' } },
      { time: '08:30 - 09:00', title: { TH: 'เช็คอินท่าเรือ', EN: 'Check-in at Pier', ZH: '码头签到', RU: 'Регистрация на пирсе' }, description: { TH: 'รับประทานของว่าง รับฟังบรีฟจากไกด์', EN: 'Light snacks & safety briefing', ZH: '享用轻食早餐并听取安全讲解', RU: 'Легкий завтрак и инструктаж' } },
      { time: '09:00', title: { TH: 'ออกเดินทาง', EN: 'Depart Pier', ZH: '登船出发', RU: 'Отплытие' }, description: { TH: 'มุ่งหน้าสู่มรกตแห่งอันดามัน หมู่เกาะพีพี', EN: 'Head towards Phi Phi Islands', ZH: '乘快艇驶向皮皮岛群', RU: 'Курс на острова Пхи-Пхи' } },
      { time: '10:00 - 12:30', title: { TH: 'อ่าวมายา & ปิเละลากูน', EN: 'Maya Bay & Pileh Lagoon', ZH: '玛雅湾与皮勒湾', RU: 'Мая Бэй и Лагуนา Пиле' }, description: { TH: 'ถ่ายรูปอ่าวมายา กระโดดน้ำเล่นที่ปิเละลากูน และชมถ้ำไวกิ้ง', EN: 'Photos at Maya Bay, jump into Pileh Lagoon, see Viking Cave', ZH: '打卡玛雅湾，皮勒湾跳水打卡，远观维京溶洞', RU: 'Фото на Мая Бэй, купание в лагуне, осмотр пещеры' } },
      { time: '12:30 - 13:30', title: { TH: 'บุฟเฟต์อาหารกลางวัน', EN: 'Buffet Lunch', ZH: '自助午餐', RU: 'Обед' }, description: { TH: 'รับประทานอาหารบนเกาะพีพีดอน', EN: 'International & Thai lunch on Phi Phi Don', ZH: '在皮皮栋岛享用泰式自助午餐', RU: 'Обед на острове Пхи-Пхи Дон' } },
      { time: '14:00 - 15:30', title: { TH: 'ดำน้ำดูปะการัง & เกาะไข่', EN: 'Snorkeling & Khai Island', ZH: '浮潜与鸡蛋岛', RU: 'Снорклинг и о. Кхай' }, description: { TH: 'ดำน้ำจุดปะการังน้ำใส เดินเล่นผ่อนคลายที่เกาะไข่', EN: 'Snorkel at coral spot, relax on Khai beach', ZH: '水下浮潜观赏珊瑚，鸡蛋岛漫步', RU: 'Снорклинг и отдых на пляже Кхай' } },
      { time: '16:30 - 17:30', title: { TH: 'เดินทางกลับโรงแรม', EN: 'Return Transfer', ZH: '返回酒店', RU: 'Возвращение' }, description: { TH: 'ถึงท่าเรือและส่งท่านกลับโรงแรมโดยสวัสดิภาพ', EN: 'Arrive pier and transfer back to hotel', ZH: '抵达码头，专车送回酒店', RU: 'Прибытие и трансфер в отель' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.9,
    reviewCount: 328,
    tags: ['Best Seller', 'Phi Phi', 'Speedboat', 'Includes Lunch'],
    isFeatured: true,
    isAvailable: true
  },
  {
    id: 'tour-2',
    slug: 'james-bond-island-phang-nga-kayak',
    category: 'island',
    categoryLabel: {
      TH: 'ทัวร์อ่าวพังงา (Big Boat/Kayak)',
      EN: 'Phang Nga Bay Tour',
      ZH: '攀牙湾海划艇一日游',
      RU: 'Экскурсия в залив Пханг Нга'
    },
    title: {
      TH: 'ทัวร์เขาพิงกัน เกาะเจมส์บอนด์ พายเรือแคนูอ่าวพังงา & เกาะปันหยี',
      EN: 'James Bond Island, Phang Nga Bay Sea Canoeing & Panyee Floating Village',
      ZH: '詹姆斯邦德岛 007 岛、攀牙湾皮划艇探险与水上人家一日游',
      RU: 'Остров Джеймса Бонда 007, Каายакинг в заливе Пханг Нга и деревня Пани'
    },
    description: {
      TH: 'ย้อนรอยภาพยนตร์ 007 เขาพิงกันและเขาตะปู ตื่นตาตื่นใจกับถ้ำลอดและหินงอกหินย้อย พายเรือแคนูชมป่าชายเลนอ่าวพังงา และเยี่ยมชมหมู่บ้านชาวการประมงกลางน้ำเกาะปันหยี พร้อมอาหารบุฟเฟต์เที่ยง',
      EN: 'Visit iconic James Bond Island (Khao Phing Kan) featured in 007 movie! Canoe through secret sea caves at Hong Island, marvel at limestone karst cliffs, and explore the famous Panyee floating Muslim village.',
      ZH: '探访著名 007 电影取景地詹姆斯邦德岛（Tabu Cliff）！在洪岛乘坐独木舟穿梭于神秘溶洞与红树林之间，感受攀牙湾喀斯特地貌的震撼，参观独特的潘依岛水上清真游牧村落。',
      RU: 'Посетите культовый остров Джеймса Бонда из фильма 007! Покатайтесь на каяке сквозь пещеры острова Хонг, полюбуйтесь известняковыми скалами и посетите плавучую деревню Пани.'
    },
    highlights: {
      TH: ['เขาตะปู & เขาพิงกัน (James Bond Island)', 'พายเรือแคนูสำรวจถ้ำลอดเกาะห้อง', 'ชมหมู่บ้านประมงกลางน้ำเกาะปันหยี', 'วิวภูเขาหินปูนกลางทะเลอันดามัน'],
      EN: ['James Bond Island (007 Movie)', 'Sea Canoeing inside Hong Island caves', 'Explore Panyee Floating Fishing Village', 'Breathtaking limestone karst bay scenery'],
      ZH: ['打卡 007 电影詹姆斯邦德岛', '洪岛神秘溶洞独木舟探险', '探秘千人水上高脚木屋渔村', '攀牙湾海蚀洞与海上奇峰'],
      RU: ['Остров Джеймса Бонда (007)', 'Каякинг в пещерах острова Хонг', 'Плавучая деревня Пани', 'Живописные скалы залива Пханг Нга']
    },
    priceAdult: 1650,
    priceChild: 1200,
    originalPriceAdult: 2400,
    originalPriceChild: 1800,
    duration: {
      TH: '08:00 - 17:00 น. (9 ชม.)',
      EN: '08:00 AM - 05:00 PM (9 Hours)',
      ZH: '08:00 - 17:00 (9小时)',
      RU: '08:00 - 17:00 (9 часов)'
    },
    location: 'Phang Nga Bay, Thailand',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Kamala', 'Surin'],
    included: {
      TH: ['รถรับส่งจากโรงแรม', 'เรือนำเที่ยวขนาดใหญ่ปลอดภัย', 'กัปตันพายเรือแคนูมืออาชีพ', 'อาหารกลางวันบุฟเฟต์บนเรือ/เกาะปันหยี', 'ประกันอุบัติเหตุทางทะเล'],
      EN: ['Hotel roundtrip transfers', 'Comfortable big boat tour', 'Professional paddleman for canoeing', 'Delicious buffet lunch', 'Marine safety insurance'],
      ZH: ['酒店往返接送', '舒适游船与安全设备', '专业独木舟划桨员服务', '泰式美味自助午餐', '海上旅游意外保险'],
      RU: ['Трансфер из отеля', 'Прогулочный большой корабль', 'Персональный гребец для каяка', 'Обед "шведский стол"', 'Страховка']
    },
    itinerary: [
      { time: '08:00 - 08:30', title: { TH: 'รับจากโรงแรม', EN: 'Hotel Pick-up', ZH: '酒店接送', RU: 'Трансфер из отеля' } },
      { time: '09:30', title: { TH: 'ล่องเรือชมอ่าวพังงา', EN: 'Cruise Phang Nga Bay', ZH: '巡航攀牙湾', RU: 'Круиз по заливу' } },
      { time: '10:30', title: { TH: 'พายเรือแคนูเกาะห้อง', EN: 'Sea Canoeing at Hong Island', ZH: '洪岛划皮划艇', RU: 'Каякинг на о. Хонг' } },
      { time: '12:00', title: { TH: 'เยี่ยมชมเกาะเจมส์บอนด์', EN: 'James Bond Island Sightseeing', ZH: '游览 007 詹姆斯邦德岛', RU: 'Остров Джеймса Бонда' } },
      { time: '13:30', title: { TH: 'อาหารเที่ยงเกาะปันหยี', EN: 'Lunch at Panyee Village', ZH: '水上人家享用午餐', RU: 'Обед в деревне Пани' } },
      { time: '16:30 - 17:00', title: { TH: 'ส่งกลับโรงแรม', EN: 'Hotel Drop-off', ZH: '送回酒店', RU: 'Возвращение' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.8,
    reviewCount: 215,
    tags: ['James Bond', 'Canoeing', 'Family Friendly'],
    isFeatured: true,
    isAvailable: true
  },
  {
    id: 'tour-3',
    slug: 'sunset-catamaran-yacht-coral-promthep',
    category: 'sunset',
    categoryLabel: {
      TH: 'ล่องเรือยอชท์ชมพระอาทิตย์ตก',
      EN: 'Sunset Catamaran Yacht',
      ZH: '日落帆船双体游艇',
      RU: 'Закат на Яхте-Катамаране'
    },
    title: {
      TH: 'ล่องเรือยอชท์คาทามารันชมพระอาทิตย์ตก แหลมพรหมเทพ & เกาะเฮ (Coral Island)',
      EN: 'Sunset Power Catamaran Yacht Tour to Coral Island & Promthep Cape Sunset',
      ZH: '珊瑚岛 (Koh Hey) 与神仙半岛日落双体帆船游艇奢华半日游',
      RU: 'Круиз на закате на катамаране: Коралловый остров и мыс Промтеп'
    },
    description: {
      TH: 'สัมผัสประสบการณ์สุดหรูหราบนเรือยอชท์คาทามารัน สนุกสนานกับกิจกรรมทางน้ำ ดำน้ำดูปะการังบนหาด Banana Beach เกาะเฮ พร้อมทานอาหารค่ำสเต็ก/BBQ บนเรือ จิบไวน์และชมพระอาทิตย์ตกดินสุดโรแมนติกที่แหลมพรหมเทพ',
      EN: 'Sail on a luxury sailing catamaran yacht! Relax on white sands at Coral Island Banana Beach, enjoy clear water snorkeling, transparent kayaking, and feast on delicious BBQ dinner while watching romantic sunset over Promthep Cape.',
      ZH: '乘坐豪华双体帆船游艇出发！在珊瑚岛香蕉海滩（Banana Beach）享受洁白沙滩与水上项目，深潜与透明皮划艇体验，随后在游艇上享用日落烤肉晚餐，并于神仙半岛海面欣赏震撼的落日晚霞。',
      RU: 'Роскошный круиз на парусном катамаране! Отдых на Банановом пляже Кораллового острова, снорклинг, ужин с барбекю на борту и романтический закат у мыса Промтеп.'
    },
    highlights: {
      TH: ['เรือยอชท์คาทามารันดีไซน์หรูหรา ถ่ายรูปสวยทุกมุม', 'พักผ่อน Banana Beach เกาะเฮ น้ำทะเลใสสะอาด', 'อาหารค่ำ BBQ สเต็ก/ซีฟู้ด & ไวน์บนเรือ', 'ชมพระอาทิตย์ตกดินแหลมพรหมเทพ'],
      EN: ['Luxury Catamaran with spacious photo decks', 'Banana Beach Coral Island relaxation', 'BBQ Seafood dinner onboard with drinks', 'Breathtaking sunset view at Promthep Cape'],
      ZH: ['奢华双体帆船网床与360度打卡甲板', '珊瑚岛 Banana Beach 优质水质与水上运动', '游艇上享用海鲜 BBQ 日落晚餐与红酒', '神仙半岛金黄色绝美落日余晖'],
      RU: ['Роскошный катамаран с сетками для фото', 'Пляж Banana Beach на Коралловом острове', 'Ужин барбекю с морепродуктами и напитками', 'Закат у мыса Промтеп']
    },
    priceAdult: 2490,
    priceChild: 1790,
    originalPriceAdult: 3500,
    originalPriceChild: 2500,
    duration: {
      TH: '12:30 - 19:00 น. (ครึ่งวันบ่ายชมพระอาทิตย์ตก)',
      EN: '12:30 PM - 07:00 PM (Afternoon & Sunset)',
      ZH: '12:30 - 19:00 (下午日落半日游)',
      RU: '12:30 - 19:00 (Вторая половина дня)'
    },
    location: 'Chalong Pier / Coral Island / Promthep Cape',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Chalong', 'Rawai', 'Phuket Town'],
    included: {
      TH: ['รถตู้VIP รับส่งโรงแรม', 'เรือยอชท์คาทามารันนำเที่ยวพร้อมกัปตันและลูกเรือ', 'อาหารค่ำแบบ BBQ & สเต็กบนเรือ', 'น้ำผลไม้ เครื่องดื่ม ผลไม้ตามฤดูกาล', 'อุปกรณ์ดำน้ำ หน้ากาก ชูชีพ', 'ประกันภัยการเดินทาง'],
      EN: ['VIP hotel transfers', 'Catamaran yacht with captain & crew', 'BBQ & Steak dinner onboard', 'Soft drinks, wine/beer, tropical fruit', 'Snorkeling mask & life jacket', 'Travel Insurance'],
      ZH: ['VIP专车往返接送', '双体游艇船长与船员全程服务', '船上烤肉/牛排/海鲜日落晚餐', '软饮、红酒、热带水果', '浮潜装备与救生衣', '旅游保险'],
      RU: ['Трансфер VIP', 'Яхта-катамаран с экипажем', 'Ужин барбекю на борту', 'Напитки, вино и фрукты', 'Снаряжение для снорклинга', 'Страховка']
    },
    itinerary: [
      { time: '12:30 - 13:00', title: { TH: 'รับจากโรงแรม', EN: 'Hotel Transfer', ZH: '酒店接送', RU: 'Трансфер из отеля' } },
      { time: '13:30', title: { TH: 'ออกเรือจากท่าเรือฉลอง', EN: 'Depart Chalong Pier', ZH: '查龙码头启航', RU: 'Отплытие из Чалонга' } },
      { time: '14:30 - 16:30', title: { TH: 'เกาะเฮ Banana Beach', EN: 'Coral Island Banana Beach', ZH: '珊瑚岛香蕉海滩', RU: 'Коралловый остров' } },
      { time: '17:30', title: { TH: 'อาหารค่ำ BBQ บนเรือ', EN: 'BBQ Dinner Onboard', ZH: '船上日落晚餐', RU: 'Ужин барбекю' } },
      { time: '18:15 - 18:45', title: { TH: 'ชมพระอาทิตย์ตกแหลมพรหมเทพ', EN: 'Promthep Sunset Viewpoint', ZH: '神仙半岛落日盛景', RU: 'Закат у мыса Промтеп' } },
      { time: '19:30', title: { TH: 'ส่งกลับโรงแรม', EN: 'Return to Hotel', ZH: '返程送回酒店', RU: 'Возвращение' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.95,
    reviewCount: 189,
    tags: ['Luxury Yacht', 'Sunset BBQ', 'Promthep Cape', 'Romantic'],
    isFeatured: true,
    isAvailable: true
  },
  {
    id: 'tour-4',
    slug: 'similan-islands-snorkeling-day-trip',
    category: 'island',
    categoryLabel: {
      TH: 'ทัวร์สิมิลัน (สปีดโบ๊ท)',
      EN: 'Similan Islands Day Trip',
      ZH: '斯米兰群岛深纯一日游',
      RU: 'Острова Симилан'
    },
    title: {
      TH: 'ทัวร์อุทยานแห่งชาติหมู่เกาะสิมิลัน ดำน้ำปะการัง หินเรือใบ โดยเรือสปีดโบ๊ท',
      EN: 'Similan Islands National Park Snorkeling & Sailing Rock Tour',
      ZH: '斯米兰群岛国家公园 潜水与风帆石纯玩一日游 (快艇)',
      RU: 'Национальный парк Острова Симилан и скала Парус'
    },
    description: {
      TH: 'สวรรค์ของคนรักการดำน้ำ! เยี่ยมชมหมู่เกาะสิมิลันเกาะ 4, เกาะ 8 (หินเรือใบ), เกาะ 7 และเกาะ 9 ชมปะการังอันสมบูรณ์ น้ำทะเลสีฟ้าเทอร์ควอยซ์และเต่าทะเล ร่วมรับประทานอาหารบนเกาะ',
      EN: 'The ultimate snorkeling paradise in Thailand! Explore Similan Island No. 8 (Donald Duck Bay & Sail Rock), Island No. 4 (Princess Bay), Island No. 7 & No. 9 with crystal clear turquoise ocean and sea turtles.',
      ZH: '泰国终极水下潜水天堂！探索斯米兰 4 号岛（公主湾）、8 号岛（风帆石视角）、7 号与 9 号岛。在蔚蓝透亮的海水中与海龟同游，尽情感受天然海洋之美。',
      RU: 'Рай для снорклинга! Посетите острова Симилан № 8 (Скала Парус), № 4, № 7 и № 9. Бирюзовая вода, морские черепахи и коралловые сады.'
    },
    highlights: {
      TH: ['จุดชมวิวหินเรือใบ (Sail Rock) อันเป็นเอกลักษณ์', 'ชมเต่าทะเลและฝูงปลาการ์ตูน', 'น้ำทะเลสีฟ้าใสระดับท็อป 10 ของโลก', 'รวมค่าธรรมเนียมอุทยานแห่งชาติ'],
      EN: ['Iconic Sail Rock viewpoint climb', 'Sea turtle swimming spot', 'Top 10 world-class clear water snorkeling', 'National park entrance fees included'],
      ZH: ['登顶标志性风帆石 360 度俯瞰海景', '海龟保育区与小丑鱼栖息地', '世界前十名顶级果冻海与透明水质', '含斯米兰国家公园上岛门票'],
      RU: ['Смотровая площадка Скала Парус', 'Плавание с морскими черепахами', 'Вода входящая в Топ-10 мира по прозрачности', 'Входные билеты в нацпарк включены']
    },
    priceAdult: 2790,
    priceChild: 1990,
    originalPriceAdult: 3900,
    originalPriceChild: 2800,
    duration: {
      TH: '06:00 - 18:30 น. (เต็มวัน)',
      EN: '06:00 AM - 06:30 PM (Full Day Excursion)',
      ZH: '06:00 - 18:30 (全天特惠早出)',
      RU: '06:00 - 18:30 (Полный день)'
    },
    location: 'Similan Islands, Phang Nga / Departure from Tublamu Pier',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Khao Lak', 'Mai Khao'],
    included: {
      TH: ['รถรับส่งจากภูเก็ต/เขาหลัก', 'ค่าธรรมเนียมเข้าอุทยานสิมิลัน', 'อาหารเช้า อาหารเที่ยง และอาหารเย็นตอนกลับ', 'อุปกรณ์ดำน้ำตื้นครบชุด', 'ประกันภัยทางทะเล'],
      EN: ['Roundtrip transfers from Phuket/Khao Lak', 'Similan National Park entrance fee', 'Breakfast, Lunch buffet & Light Dinner at pier', 'Full snorkeling set with fins', 'Insurance'],
      ZH: ['普吉/考拉全境酒店往返接送', '含斯米兰国家公园门票', '码头早餐、岛上午餐、回程晚间轻食', '高品质浮潜面镜与蛙鞋', '海上全额意外险'],
      RU: ['Трансфер из отеля', 'Входной билет в нацпарк', 'Завтрак, Обед и Легкий ужин', 'Снаряжение для снорклинга', 'Страховка']
    },
    itinerary: [
      { time: '06:00 - 07:00', title: { TH: 'รับจากโรงแรม', EN: 'Early Pick-up', ZH: '清晨酒店接送', RU: 'Ранний трансфер' } },
      { time: '08:00', title: { TH: 'ทานอาหารเช้าที่ท่าเรือทับละมุ', EN: 'Breakfast at Pier', ZH: '码头享用早餐', RU: 'Завтрак на пирсе' } },
      { time: '10:00 - 12:00', title: { TH: 'เกาะ 4 & เกาะ 7 ดำน้ำ', EN: 'Island No. 4 & No. 7 Snorkeling', ZH: '4号与7号岛浮潜', RU: 'Острова № 4 и № 7' } },
      { time: '12:30', title: { TH: 'รับประทานอาหารกลางวัน', EN: 'Lunch on Island No. 8', ZH: '8号岛享用午餐', RU: 'Обед на о. № 8' } },
      { time: '13:30 - 15:00', title: { TH: 'จุดชมวิวหินเรือใบ & เกาะ 9', EN: 'Sail Rock Viewpoint & Island No. 9', ZH: '登风帆石与9号岛', RU: 'Скала Парус и о. № 9' } },
      { time: '18:00 - 18:30', title: { TH: 'ส่งกลับโรงแรม', EN: 'Drop-off at Hotel', ZH: '送回酒店', RU: 'Возвращение' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.98,
    reviewCount: 412,
    tags: ['Similan', 'National Park', 'Top Snorkeling'],
    isFeatured: true,
    isAvailable: true
  },
  {
    id: 'tour-5',
    slug: 'phuket-elephant-care-sanctuary-eco',
    category: 'eco',
    categoryLabel: {
      TH: 'ปางช้างเชิงอนุรักษ์',
      EN: 'Elephant Sanctuary Eco Tour',
      ZH: '大象生态保护区',
      RU: 'Заповедник Слонов'
    },
    title: {
      TH: 'ทัวร์ปางช้างเชิงอนุรักษ์ ภูเก็ต ป้อนอาหาร ทำสปาโคลน & อาบน้ำช้าง (No Riding)',
      EN: 'Phuket Ethical Elephant Sanctuary: Feeding, Mud Spa & Bathing Program (No Riding)',
      ZH: '普吉岛无骑乘爱心大象保护区：喂食、泥浆 SPA 与大象洗澡半日游',
      RU: 'Этический заповедник слонов: кормление, грязевое СПА и купание (Без катания)'
    },
    description: {
      TH: 'ร่วมสัมผัสความน่ารักของช้างไทยอย่างเป็นธรรมชาติ ไม่มีการขี่ช้าง ไม่ใช้ตะขอ กิจกรรมเตรียมอาหารสมุนไพร ป้อนกล้วย ปล่อยช้างเดินเล่น ทำสปาโคลนบำรุงผิวให้ช้าง และอาบน้ำช้างในลำธารธรรมชาติ เหมาะกับครอบครัวและเด็กๆ',
      EN: 'An ethical & unforgettable elephant interaction experience! Prepare herbal nutrient balls, feed bananas, walk with happy elephants in the jungle, enjoy elephant mud spa and bathe them in river. 100% No Riding policy.',
      ZH: '人道且富有教育意义的纯爱心大象体验！亲自调制大象草药营养球，喂食香蕉与甘蔗，与大象在树林间并肩散步，体验大象天然泥浆 SPA，并与大象在清澈溪流中共度清凉洗澡时光。',
      RU: 'Незабываемый этичный опыт общения со слонами! Приготовление травяного лакомства, кормление, прогулка, грязевое СПА и купание в реке. 100% Без катания.'
    },
    highlights: {
      TH: ['นโยบาย No Riding ไม่มีการขี่ช้างหรือทำร้ายช้าง 100%', 'กิจกรรมทำสปาโคลน Elephant Mud Spa', 'สนุกกับการป้อนอาหารและทำวิตามินช้าง', 'รวมอาหารไทยบุฟเฟต์ปรุงสด'],
      EN: ['100% Ethical & No-Riding Guarantee', 'Interactive Elephant Mud Spa & River Bath', 'Prepare nutrient food & feed bananas', 'Fresh home-style Thai buffet included'],
      ZH: ['100% 承诺无骑乘、无钩打、无看戏', '有趣性十足的大象泥浆 SPA 与河道洗澡', '亲手制作营养食品与喂食香蕉', '含可口泰式家常菜自助餐'],
      RU: ['100% Этичный подход (Без катания)', 'Грязевое СПА и купание со слонами', 'Приготовление корма и кормление', 'Тайский обед']
    },
    priceAdult: 1950,
    priceChild: 1450,
    originalPriceAdult: 2600,
    originalPriceChild: 1900,
    duration: {
      TH: 'รอบเช้า 08:30 - 12:30 / รอบบ่าย 13:00 - 17:00 น. (4 ชม.)',
      EN: 'Morning 08:30-12:30 / Afternoon 13:00-17:00 (4 Hours)',
      ZH: '上午场 08:30-12:30 / 下午场 13:00-17:00 (4小时)',
      RU: 'Утро 08:30-12:30 / День 13:00-17:00 (4 часа)'
    },
    location: 'Kathu / Chalong, Phuket',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Kamala', 'Chalong'],
    included: {
      TH: ['รถรับส่งจากโรงแรม', 'ตระกร้าผลไม้กล้วยและอ้อยสำหรับป้อนช้าง', 'ชุดไทยเปลี่ยนสำหรับทำกิจกรรม', 'อาหารกลางวัน/เย็นปรุงสด', 'ประกันภัยอุบัติเหตุ'],
      EN: ['Hotel transfers', 'Fruit baskets & herbs for elephants', 'Traditional clothing provided for activity', 'Fresh cooked Thai meal', 'Accident Insurance'],
      ZH: ['酒店往返接送', '大象喂食水果篮与草药食材', '体验用活动换洗服装与毛巾', '现烹泰式清真/素食可供午餐', '意外保险'],
      RU: ['Трансфер из отеля', 'Корм для слонов', 'Одежда для активности и полотенца', 'Тайский обед', 'Страховка']
    },
    itinerary: [
      { time: '08:30 / 13:00', title: { TH: 'รับจากโรงแรม', EN: 'Hotel Pick-up', ZH: '酒店接送', RU: 'Трансфер' } },
      { time: '09:15 / 13:45', title: { TH: 'ฟังการบรรยายประวัติช้าง', EN: 'Elephant Orientation', ZH: '了解大象保护知识', RU: 'Инструктаж' } },
      { time: '09:45 / 14:15', title: { TH: 'ทำสปาโคลน & ป้อนอาหาร', EN: 'Mud Spa & Banana Feeding', ZH: '泥浆 SPA 与大象喂食', RU: 'Грязевое СПА и кормление' } },
      { time: '11:00 / 15:30', title: { TH: 'อาบน้ำช้างในลำธาร', EN: 'Elephant Bath in River', ZH: '与大象溪流洗澡', RU: 'Купание слонов' } },
      { time: '12:00 / 16:30', title: { TH: 'รับประทานอาหารบุฟเฟต์ & ส่งกลับ', EN: 'Thai Meal & Hotel Drop-off', ZH: '享用美食并送回', RU: 'Обед и трансфер' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.96,
    reviewCount: 289,
    tags: ['Ethical Sanctuary', 'No Riding', 'Kids Favorite'],
    isFeatured: true,
    isAvailable: true
  },
  {
    id: 'tour-6',
    slug: 'phuket-city-tour-big-buddha-promthep',
    category: 'sightseeing',
    categoryLabel: {
      TH: 'เที่ยวรอบเมืองภูเก็ต',
      EN: 'Phuket Sightseeing City Tour',
      ZH: '普吉环岛深度观光',
      RU: 'Обзорный тур по Пхукету'
    },
    title: {
      TH: 'ทัวร์เที่ยวรอบเมืองภูเก็ต วัดฉลอง พระใหญ่ภูเก็ต ย่านเมืองเก่า ชิโนโปรตุกีส & แหลมพรหมเทพ',
      EN: 'Phuket City Highlights Tour: Big Buddha, Wat Chalong, Old Town & Promthep Viewpoint',
      ZH: '普吉岛精选半日游：普吉大佛、查龙寺、老街葡萄牙建筑与神仙半岛',
      RU: 'Обзорный тур: Большой Будда, Храм Чалонг, Старый Город и Мыс Промтеп'
    },
    description: {
      TH: 'เที่ยวครบไฮไลท์ภูเก็ตในวันเดียว! สักการะพระใหญ่ภูเก็ตบนยอดเขานาคเกิด ชมความงามวัดฉลอง เดินถ่ายรูปตึกชิโนโปรตุกีส ย่านเมืองเก่าภูเก็ต ชิมขนมพื้นเมือง และปิดท้ายด้วยการชมวิวทะเลแหลมพรหมเทพ',
      EN: 'Explore the heart and soul of Phuket! Visit 45-meter Big Buddha on Nakkerd Hill, sacred Wat Chalong Temple, stroll color Sino-Portuguese heritage buildings in Old Phuket Town, and capture breathtaking sea sunset views at Promthep Cape.',
      ZH: '全方位打卡普吉岛人文与自然精华！参观山顶 45 米高的白玉普吉大佛，参拜查龙寺，漫步老城区充满南洋风情的中葡式复古骑楼建筑群，品尝老街特色小吃，并于神仙半岛俯瞰壮丽海景。',
      RU: 'Погрузитесь в культуру и красоту Пхукета! Посетите 45-метрового Большого Будду, священный храм Чалонг, прогуляйтесь по Старому Городу с сино-португальской архитектурой и полюбуйтесь видом с мыса Промтеп.'
    },
    highlights: {
      TH: ['พระใหญ่ภูเก็ต (Big Buddha) วิว 360 องศา', 'วัดฉลอง (Wat Chalong) วัดคู่บ้านคู่เมืองภูเก็ต', 'เมืองเก่าภูเก็ต (Old Phuket Town) ถ่ายรูปกับตึกชิโนโปรตุกีส', 'จุดชมวิวแหลมพรหมเทพ'],
      EN: ['Panoramic 360 view from Big Buddha', 'Historic sacred Wat Chalong Temple', 'Sino-Portuguese architecture in Phuket Old Town', 'Promthep Cape iconic coastal scenery'],
      ZH: ['普吉山顶大佛 360 度俯瞰普吉全景', '普吉岛香火最旺之查龙寺参拜', '普吉老街葡萄牙风情复古建筑群打卡', '神仙半岛经典海景视角'],
      RU: ['Панорама 360 от Большого Будды', 'Храм Чалонг', 'Старый Город с архитектурой', 'Смотровая мыса Промтеп']
    },
    priceAdult: 890,
    priceChild: 650,
    originalPriceAdult: 1400,
    originalPriceChild: 1000,
    duration: {
      TH: '09:00 - 15:00 น. (6 ชม.)',
      EN: '09:00 AM - 03:00 PM (6 Hours)',
      ZH: '09:00 - 15:00 (6小时)',
      RU: '09:00 - 15:00 (6 часов)'
    },
    location: 'Phuket Town, Chalong, Promthep',
    pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Rawai', 'Chalong', 'Kamala'],
    included: {
      TH: ['รถตู้ปรับอากาศ VIP พร้อมคนขับ', 'ไกด์นำเที่ยวสื่อสารหลายภาษา', 'น้ำดื่มเย็นบรรจุขวดตลอดเดินทาง', 'ประกันอุบัติเหตุการเดินทาง'],
      EN: ['Air-conditioned VIP minibus', 'Multilingual licensed guide', 'Cold bottled drinking water', 'Travel insurance'],
      ZH: ['空调 VIP 商务接送车', '多语言专业导游讲解', '全程冰镇矿泉水', '旅游意外保险'],
      RU: ['VIP Микроавтобус с кондиционером', 'Лицензированный гид', 'Прохладная вода', 'Страховка']
    },
    itinerary: [
      { time: '09:00', title: { TH: 'รับจากโรงแรม', EN: 'Hotel Pick-up', ZH: '酒店接送', RU: 'Трансфер' } },
      { time: '09:45', title: { TH: 'เยี่ยมชมพระใหญ่ภูเก็ต', EN: 'Big Buddha Temple', ZH: '参观普吉大佛', RU: 'Большой Будда' } },
      { time: '11:00', title: { TH: 'สักการะวัดฉลอง', EN: 'Wat Chalong Temple', ZH: '参拜查龙寺', RU: 'Храм Чалонг' } },
      { time: '12:15', title: { TH: 'เดินเที่ยวย่านเมืองเก่าภูเก็ต', EN: 'Phuket Old Town Walk', ZH: '漫步普吉老街', RU: 'Старый Город' } },
      { time: '14:00', title: { TH: 'จุดชมวิวแหลมพรหมเทพ', EN: 'Promthep Viewpoint', ZH: '神仙半岛观景', RU: 'Мыс Промтеп' } },
      { time: '15:00', title: { TH: 'ส่งกลับโรงแรม', EN: 'Hotel Drop-off', ZH: '送回酒店', RU: 'Возвращение' } }
    ],
    images: [
      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80'
    ],
    rating: 4.85,
    reviewCount: 164,
    tags: ['Phuket City', 'Big Buddha', 'Culture', 'Value Deal'],
    isFeatured: false,
    isAvailable: true
  }
];

export const initialReviews: Review[] = [
  {
    id: 'rev-1',
    tourId: 'tour-1',
    userName: 'คุณสมชาย และครอบครัว',
    nationality: 'TH',
    rating: 5,
    comment: 'ประทับใจทริปเกาะพีพีมากครับ เรือใหม่และสะอาดมาก ไกด์ดูแลเอาใจใส่ดี ยอดเงินโอนผ่าน PromptPay QR สะดวก ได้รับ Voucher ยืนยันทาง LINE เร็วมาก เด็กๆ ชอบปิเละลากูนที่สุด!',
    date: '2026-08-10',
    verifiedBooking: true,
    photos: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80'],
    adminReply: 'ขอบพระคุณคุณสมชายและครอบครัวมากครับที่เลือกใช้บริการ Trip Sea Tour Phuket ยินดีต้อนรับกลับมาเที่ยวภูเก็ตอีกครั้งนะครับ!',
    adminReplyDate: '2026-08-10',
    isApproved: true
  },
  {
    id: 'rev-2',
    tourId: 'tour-3',
    userName: 'Alexandre & Elena',
    nationality: 'RU',
    rating: 5,
    comment: 'Wonderful sunset yacht tour! The BBQ dinner was delicious, and seeing the sunset at Promthep Cape from the catamaran deck was magical. Payment via PromptPay QR was fast.',
    date: '2026-08-08',
    verifiedBooking: true,
    photos: ['https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=600&q=80'],
    isApproved: true
  },
  {
    id: 'rev-3',
    tourId: 'tour-5',
    userName: '李先生 & 张小姐',
    nationality: 'ZH',
    rating: 5,
    comment: '非常有意义的大象保护区之旅！没有骑大象，能给大象做泥巴SPA和洗澡，大象非常快乐。在线预订流程很畅通，在线客服在LINE上很快解答了我们的问题，强烈推荐！',
    date: '2026-08-05',
    verifiedBooking: true,
    isApproved: true
  }
];

export const initialBookings: Booking[] = [
  {
    id: 'bk-1001',
    bookingRef: 'TST-202608-0101',
    tourId: 'tour-1',
    tourTitle: 'ทัวร์เกาะพีพี มายา ปิเละลากูน & เกาะไข่ โดยเรือสปีดโบ๊ท',
    tourImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    customerName: 'คุณณัฐพล วงศ์สว่าง',
    customerEmail: 'nattapol.w@gmail.com',
    customerPhone: '0819876543',
    customerLineId: 'nattapol_w',
    nationality: 'Thai',
    travelDate: '2026-08-18',
    pickupHotel: 'The Sea Galleri by Katathani, Patong',
    pickupZone: 'Patong',
    roomNumber: '402',
    specialRequests: 'ขอเสื้อชูชีพสำหรับเด็ก 1 ตัวครับ',
    adults: 2,
    children: 1,
    infants: 0,
    totalAmount: 5170,
    paymentMethod: 'promptpay',
    promptPayIdUsed: '0812345678',
    paymentStatus: 'verified',
    orderStatus: 'confirmed',
    slipUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    paidAt: '2026-08-12T10:15:00.000Z',
    createdAt: '2026-08-12T10:10:00.000Z',
    lineNotifySent: true
  },
  {
    id: 'bk-1002',
    bookingRef: 'TST-202608-0102',
    tourId: 'tour-3',
    tourTitle: 'ล่องเรือยอชท์คาทามารันชมพระอาทิตย์ตก แหลมพรหมเทพ & เกาะเฮ',
    tourImage: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=600&q=80',
    customerName: 'David Miller',
    customerEmail: 'david.miller@example.com',
    customerPhone: '+66823456789',
    customerLineId: 'david_m_phuket',
    nationality: 'British',
    travelDate: '2026-08-20',
    pickupHotel: 'Banyan Tree Phuket, Bangtao',
    pickupZone: 'Bangtao',
    roomNumber: 'Villa 12',
    specialRequests: 'Vegetarian meals for 1 adult',
    adults: 2,
    children: 0,
    infants: 0,
    totalAmount: 4980,
    paymentMethod: 'promptpay',
    promptPayIdUsed: '0812345678',
    paymentStatus: 'slip_uploaded',
    orderStatus: 'pending',
    slipUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    slipUploadedAt: '2026-08-12T14:20:00.000Z',
    createdAt: '2026-08-12T14:15:00.000Z',
    lineNotifySent: true
  },
  {
    id: 'bk-1003',
    bookingRef: 'TST-202608-0103',
    tourId: 'tour-5',
    tourTitle: 'ทัวร์ปางช้างเชิงอนุรักษ์ ภูเก็ต (No Riding)',
    tourImage: 'https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&w=600&q=80',
    customerName: 'Chen Wei',
    customerEmail: 'chenwei88@qq.com',
    customerPhone: '+8613812345678',
    customerLineId: 'chenwei_weixin',
    nationality: 'Chinese',
    travelDate: '2026-08-22',
    pickupHotel: 'Pullman Phuket Arcadia Naithon Beach',
    pickupZone: 'Naithon',
    specialRequests: 'Morning Session preferred',
    adults: 2,
    children: 2,
    infants: 0,
    totalAmount: 6800,
    paymentMethod: 'promptpay',
    promptPayIdUsed: '0812345678',
    paymentStatus: 'verified',
    orderStatus: 'confirmed',
    paidAt: '2026-08-11T16:00:00.000Z',
    createdAt: '2026-08-11T15:50:00.000Z',
    lineNotifySent: true
  }
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'คุณณัฐพล วงศ์สว่าง',
    email: 'nattapol.w@gmail.com',
    phone: '0819876543',
    lineId: 'nattapol_w',
    nationality: 'Thai',
    totalBookings: 1,
    totalSpent: 5170,
    lastBookingDate: '2026-08-12',
    createdAt: '2026-08-12'
  },
  {
    id: 'cust-2',
    name: 'David Miller',
    email: 'david.miller@example.com',
    phone: '+66823456789',
    lineId: 'david_m_phuket',
    nationality: 'British',
    totalBookings: 1,
    totalSpent: 4980,
    lastBookingDate: '2026-08-12',
    createdAt: '2026-08-12'
  },
  {
    id: 'cust-3',
    name: 'Chen Wei',
    email: 'chenwei88@qq.com',
    phone: '+8613812345678',
    lineId: 'chenwei_weixin',
    nationality: 'Chinese',
    totalBookings: 2,
    totalSpent: 12400,
    lastBookingDate: '2026-08-11',
    createdAt: '2026-08-01'
  }
];

export const initialSettings: AppSettings = {
  siteName: 'Trip Sea Tour Phuket',
  companyName: 'ทริปซีทัวร์ ภูเก็ต จำกัด (Trip Sea Tour Phuket Co., Ltd.)',
  promptPayId: '0979241399', // PromptPay Phone Number or Tax ID
  promptPayName: 'บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด',
  lineMessagingChannelAccessToken: 'Na3ekdkIyTshDZwZItjOQGv4MXBqo/j6zzXfoES2K6Od6HEjLXDjookdpV5QzuUA6FqXknMZL3MwgiPNmupdAy9oZweKN5QKlTjdloODikwIgrlJEeyrWJW7vAzydq38jHDmKR1NZE58ji2oYNy9VwdB04t89/1O/w1cDnyilFU=',
  lineMessagingUserId: 'C1bb0d71ad5dbb960801dad6bd5208afa',
  lineNotifyToken: 'SIMULATED_LINE_NOTIFY_TOKEN_XYZ123',
  lineOaId: '@056hxinu',
  contactPhone: '+66 (0) 62 681 6494 / +66 (0) 97 924 1399',
  contactEmail: 'tripseatourphuket@gmail.com',
  address: 'ภูเก็ต ประเทศไทย',
  adminPin: '1234',
  adminGoogleEmails: ['asmr9941@gmail.com', 'admin@tripseatour.com']
};
