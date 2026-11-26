// 궁극기가 방향·위치 지정이 필요한가: 자기 몸 주변에서 터지거나 걸리는 종류는 누르면 바로 쓴다
const SELF = ['burst', 'charm', 'tether', 'buff', 'magnet', 'orbit', 'channel', 'phoenix', 'brood'];
export const ultNeedsAim = (u) => !!u && !SELF.includes(u.type) && !((u.type === 'zone' || u.type === 'meteor') && u.center === 'self');
