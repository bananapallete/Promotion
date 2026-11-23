import Phaser from "phaser";

const CELL_W = 400;
const CELL_H = 500;

class IdleScene extends Phaser.Scene {
  preload() {
    this.load.spritesheet("male-idle", "characters/male/idle.png", {
      frameWidth: CELL_W,
      frameHeight: CELL_H,
    });
  }

  create() {
    // 0→1→2→3→2→1 왕복 재생
    this.anims.create({
      key: "male-idle",
      frames: this.anims.generateFrameNumbers("male-idle", { start: 0, end: 3 }),
      frameRate: 5,
      yoyo: true,
      repeat: -1,
    });

    const { width, height } = this.scale;
    const sprite = this.add.sprite(width / 2, height / 2 + 120, "male-idle");
    sprite.setOrigin(0.5, 1); // 발(바닥) 기준
    sprite.setScale(0.5);
    sprite.play("male-idle");
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: "#1d2433",
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: IdleScene,
});
