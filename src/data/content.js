export const PRODUCT_LIST = ['CIVIL', 'GEN', 'GTS', 'SWS', 'GXD']

export const DEFAULT_PROMOTION = {
  kr: {
    header: {
      eyebrow: '마이다스 26주년',
      title: '고객 감사 프로모션',
      label: '임시 텍스트',
      date: '2026.01.01 (월) - 01.01 (금)',
    },
    sale: {
      title: '26주년 특별 할인 혜택',
      subtitle: '전 제품 신규 구매부터 추가 구매까지, 지금 만나볼 수 있는 슈퍼 혜택 라인업',
      box1: {
        headingM: '신규 구매\n할인',
        headingL: '신규 구매 할인',
        percent: '50',
        desc: '9월 30일까지 풀버전 구매 시',
      },
      box2: {
        headingM: '추가 구매\n할인',
        headingL: '추가 구매 할인',
        percent: '40',
        desc: '300만원 이상 구매 시',
      },
    },
    study: {
      title: '마이다스 맞춤화 교육 서비스',
      subtitle: '제품을 260% 활용할 수 있도록 더욱 맞춤화된 교육 서비스까지 준비했습니다.',
      box1: {
        headingM: 'Quest Hub\n온라인 학습 코스',
        headingL: 'Quest Hub 온라인 학습 코스',
        desc: '구매 고객을 위한 온라인 학습 코스를\n무료로 제공합니다.',
      },
      box2: {
        headingM: '맞춤형\n온보딩 트레이닝',
        headingL: '맞춤형 온보딩 트레이닝',
        desc: '팀의 실무에 맞춘 CAE 실습 트레이닝을\n무료로 제공합니다.',
      },
    },
    gift: {
      title: '사은품과 구매 상담',
      subtitle: '임시텍스트가 한 줄로 작성되도록 완성부탁드립니다.',
      panel: {
        heading: 'Quest Hub\n온라인 학습 코스',
        note: '*선착순 3명에게만 제공됩니다.',
      },
      qr: {
        heading: '나에게 맞는\n혜택 찾기',
        desc: '할인부터 교육 지원까지,\n구매에 맞는 혜택을 찾아보세요',
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
      eyebrow: 'MIDAS 26th Anniversary Special Promotion',
      title: 'Customer Appreciation Promotion',
      label: 'Label',
      date: '2026.01.01 (Mon) - 01.01 (Fri)',
    },
    sale: {
      title: '26th Anniversary Special Discount',
      subtitle:
        'Super benefit lineup available now, from new purchases to additional purchases on all products',
      box1: {
        headingM: 'NEW\nPURCHASE',
        headingL: 'NEW PURCHASE',
        percent: '50',
        desc: 'Full-version purchases by Sep. 30',
      },
      box2: {
        headingM: 'ADDITIONAL\nPURCHASE',
        headingL: 'ADDITIONAL PURCHASE',
        percent: '40',
        desc: 'On purchases of KRW 3M+',
      },
    },
    study: {
      title: 'Midas Customized Training Service',
      subtitle:
        'We have prepared even more customized training services to help you utilize the product 260% more.',
      box1: {
        headingM: 'Quest Hub\nOnline Learning\nCourses',
        headingL: 'Quest Hub Online Learning Courses',
        desc: 'Free access to online learning courses for purchasing customers',
      },
      box2: {
        headingM: 'Customized\nOnboarding\nTraining',
        headingL: 'Customized Onboarding Training',
        desc: 'Complimentary hands-on CAE training \ntailored to your team\'s practical needs',
      },
    },
    gift: {
      title: 'Gifts and Purchase Consultation',
      subtitle: 'Please complete so that the placeholder text is written in a single line.',
      panel: {
        heading: 'Quest Hub\nOnline Learning Courses',
        note: '*Limited to the first 3 customers.',
      },
      qr: {
        heading: 'Find Your\nBest Offer',
        desc: 'From discounts to training support,\nfind the benefits that fit your purchase',
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
    sectionTitles: {
      section01: '고객 정보',
      section02: '관심 제품 선택',
      section03: '구매 및\n견적 상세',
      section04: '구매 의향 상담 요청',
    },
    sectionIndexes: {
      section01: '01',
      section02: '02',
      section03: '03',
      section04: '04',
    },
    fields01: ['성함', '회사/기관명', '직함', '전화번호', '이메일'],
    fields03: [
      '선택 제품 / 패키지',
      '구매 카피 수',
      '정상가',
      '적용 프로모션 혜택',
      '유지보수 비용',
      '최종 구매 금액 (총액)',
    ],
    fields04: ['날짜', '성함 / 서명'],
    noticeLabel: '안내사항',
    footer: {
      contact: '구매 · 기술 문의',
      name: '마이다스 아이티 홍길동 프로',
      phone: 'M. +82-10-1234-5678',
      email: 'E. hgd0901@midasit.com',
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
    sectionTitles: {
      section01: 'Basic Info',
      section02: 'Purchase Interest',
      section03: 'Purchase & Quotation Details',
      section04: 'Purchase Intent / Consultation',
    },
    sectionIndexes: {
      section01: '01',
      section02: '02',
      section03: '03',
      section04: '04',
    },
    fields01: ['Full Name', 'Company/Organization', 'Job Title', 'Phone', 'Email'],
    fields03: [
      'Selected Product / Package',
      'Quantity',
      'List Price',
      'Promotion / Offer Applied',
      'Maintenance Fee',
      'Final Price (Grand Total)',
    ],
    fields04: ['Date', 'Name / Signature'],
    noticeLabel: 'Notice',
    footer: {
      contact: 'SALES & TECHNICAL INQUIRIES',
      name: 'MIDAS IT BRUNO MARS',
      phone: 'M. +82-10-1234-5678',
      email: 'E. hgd0901@midasit.com',
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
