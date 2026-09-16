export const PRODUCT_LIST = ['CIVIL', 'GEN', 'GTS', 'SWS', 'GXD']

export const DEFAULT_PROMOTION = {
  kr: {
    header: {
      label: '임시 텍스트',
      date: '2026.01.01 (월) - 01.01 (금)',
    },
    sale: {
      title: '26주년 특별 할인 혜택',
      subtitle: '전 제품 신규 구매부터 추가 구매까지, 지금 만나볼 수 있는 슈퍼 혜택 라인업',
      box1: {
        heading: '신규 구매\n할인',
        percent: '50',
        desc: '9월 이내 CIVIL NX 풀버전 구매 시',
      },
      box2: {
        heading: '추가 구매\n할인',
        percent: '40',
        desc: '300만원 이상 추가 구매 시 40%',
      },
    },
    study: {
      title: '마이다스 맞춤화 교육 서비스',
      subtitle: '제품을 260% 활용할 수 있도록 더욱 맞춤화된 교육 서비스까지 준비했습니다.',
      box1: {
        heading: 'Quest Hub\n온라인 학습 코스',
        desc: '필요할 때 언제든, 원하는 내용만 골라\n학습할 수 있는 온라인 코스를 무료 제공합니다.',
      },
      box2: {
        heading: '도입 맞춤형\n트레이닝',
        desc: '마이다스 엔지니어가 직접 찾아가는 맞춤형\n트레이닝을 무료 제공합니다.',
      },
    },
    gift: {
      title: '사은품과 구매 상담',
      subtitle: '임시텍스트가 한 줄로 작성되도록 완성부탁드립니다.',
      panel: {
        heading: '제품 구매 시 300만원 상당의\n고성능 노트북 즉시 증정!',
        note: '*CIVIL NX 풀버전 구매 선착순 3명에게만 제공 됩니다',
      },
      qr: {
        heading: '구매 혜택\n확인하기',
        desc: '할인부터 교육 지원까지,\n조건에 맞는 혜택을 안내해드립니다.',
        scanText: 'QR코드 스캔 or 클릭',
      },
    },
    notice: {
      title: 'NOTICE · TERMS CUSTOM',
      col1:
        '· 최종 혜택 및 계약 조건은 담당자 상담 및 견적을 기준으로 확정됩니다.\n· 프로모션 적용 제품, 할인율, 구매 조건 및 기간은 국가·사업팀별 정책에 따라 달라질 수 있습니다.',
      col2:
        '· 필요에 따라 결제 조건, PO 제출 기한, 제외 국가, 추가 할인 조건 등의 문구를 이 영역에 입력합니다.',
    },
    footer: {
      contact: '구매 · 기술 문의',
      name: '마이다스 아이티 홍길동 프로',
      phone: 'M. +82-10-1234-5678',
      email: 'E. hgd0901@midasit.com',
    },
  },
  en: {
    header: {
      label: 'Label',
      date: '2026.01.01 (Thu) - 01.31 (Sat)',
    },
    sale: {
      title: '26th Anniversary Special Discount',
      subtitle:
        'Super benefit lineup available now, from new purchases to additional purchases on all products',
      box1: {
        heading: 'New Purchase\nDiscount',
        percent: '50',
        desc: 'For CIVIL NX full version purchases within September',
      },
      box2: {
        heading: 'Additional Purchase\nDiscount',
        percent: '40',
        desc: '40% off additional purchases over $3,000',
      },
    },
    study: {
      title: 'Midas Customized Training Service',
      subtitle:
        'We have prepared even more customized training services to help you utilize the product 260% more.',
      box1: {
        heading: 'Quest Hub\nOnline Learning Courses',
        desc: 'Free online courses available anytime, so you can\nlearn only what you need, whenever you need it.',
      },
      box2: {
        heading: 'Onsite Customized\nTraining',
        desc: 'Free customized on-site training delivered directly\nby MIDAS engineers.',
      },
    },
    gift: {
      title: 'Gifts and Purchase Consultation',
      subtitle: 'Please complete so that the placeholder text is written in a single line.',
      panel: {
        heading: 'Get a high-performance laptop worth\n$3,000 instantly with your purchase!',
        note: '*Limited to the first 3 customers.',
      },
      qr: {
        heading: 'Find Your\nBest Offer',
        desc: 'From discounts to training support, find the\nbenefits that fit your purchase',
        scanText: 'Scan or Click',
      },
    },
    notice: {
      title: 'NOTICE · TERMS CUSTOM',
      col1:
        '· Final benefits and contract terms are confirmed based on consultation with the representative and the estimate.\n· Promotion applicable products, discount rates, purchase conditions, and duration may vary by country/business team policy.',
      col2:
        '· If needed, enter text such as payment terms, PO submission deadlines, excluded countries, and additional discount conditions in this area.',
    },
    footer: {
      contact: 'SALES & TECHNICAL INQUIRIES',
      name: 'MIDAS IT BRUNO MARS',
      phone: 'M. +82-10-1234-5678',
      email: 'E. hgd0901@midasit.com',
    },
  },
}

export const DEFAULT_SURVEY = {
  kr: {
    header: {
      eyebrow: '마이다스 26주년 특별 프로모션',
      title: '구매 상담 신청서',
      subtitle:
        '26주년 고객 감사 프로모션의 특별 혜택 적용을 위해 아래 고객 정보와 구매 희망 내용을 작성해 주세요.',
    },
    interestOptions: [
      { id: 'civil', label: 'CIVIL NX' },
      { id: 'fea', label: 'FEA NX' },
      { id: 'gen', label: 'GEN NX' },
      { id: 'geoxd', label: 'GEOXD' },
      { id: 'soilworks', label: 'SOILWORKS' },
      { id: 'etc', label: '기타', hasBlank: true },
    ],
    purchaseTypeOptions: [
      { id: 'new', label: '신규 구매' },
      { id: 'cross', label: '추가 구매 / Cross-sell' },
      { id: 'upgrade', label: 'Upgrade' },
    ],
    consentOptions: [
      { id: 'ready', label: '안내받은 프로모션 조건으로 구매를 희망합니다' },
      { id: 'consult', label: '구매 전 세부 혜택 및 조건에 대한 상담을 희망합니다' },
    ],
    notice: [
      '· 프로모션 적용 제품, 할인율, 구매 조건 및 기간은 국가·사업팀별 정책에 따라 달라질 수 있습니다.',
      '· 최종 혜택 및 계약 조건은 담당자 상담 및 견적을 기준으로 확정됩니다.',
      '· 사업팀 필요에 따라 결제 조건, PO 제출 기한, 제외 국가, 추가 할인 조건 등의 문구를 이 영역에 입력합니다.',
    ],
  },
  en: {
    header: {
      eyebrow: 'MIDAS 26th Anniversary Special Promotion',
      title: 'Purchase Order Form',
      subtitle:
        'Please provide your contact details and purchase preferences below to receive the applicable benefits of our 26th Anniversary Special Promotion.',
    },
    interestOptions: [
      { id: 'civil', label: 'CIVIL NX' },
      { id: 'fea', label: 'FEA NX' },
      { id: 'gen', label: 'GEN NX' },
      { id: 'geoxd', label: 'GEOXD' },
      { id: 'soilworks', label: 'SOILWORKS' },
      { id: 'etc', label: 'Other', hasBlank: true },
    ],
    purchaseTypeOptions: [
      { id: 'new', label: 'New Purchase' },
      { id: 'cross', label: 'Additional Purchase / Cross-sell' },
      { id: 'upgrade', label: 'Upgrade' },
    ],
    consentOptions: [
      { id: 'ready', label: 'I would like to proceed with the purchase under the promotional terms provided.' },
      { id: 'consult', label: 'I would like to receive further consultation on the available benefits and purchase terms.' },
    ],
    notice: [
      '· Promotion applicable products, discount rates, purchase conditions, and periods may vary depending on the policies of each country and business team.',
      '· Final benefits and contract terms are confirmed based on consultation with the person in charge and the estimate.',
      '· Depending on the needs of the business team, phrases such as payment terms, PO submission deadlines, excluded countries, etc. may be entered in this area.',
    ],
  },
}
