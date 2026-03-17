// =============================================
// 子弹时间 + 解密 — Phaser 3 主文件
// =============================================

const GAME_W = 1024;
const GAME_H = 640;

// ---------- 关卡数据 ----------
const LEVELS = [
    {
        // 第一关：基础教学 — 射箭搭桥过沟
        name: '第一关：搭桥',
        playerStart: { x: 100, y: 480 },
        platforms: [
            { x: 0, y: 560, w: 350, h: 80 },       // 左地面
            { x: 650, y: 560, w: 374, h: 80 },      // 右地面
            // 中间是沟壑，需要用箭搭桥
        ],
        goal: { x: 950, y: 520 },
        hint: '按 J 射箭插入墙壁作为平台，跳上去过沟！',
        walls: [
            { x: 350, y: 400, w: 20, h: 160 },  // 沟左墙
            { x: 630, y: 400, w: 20, h: 160 },  // 沟右墙
        ],
        pressurePlates: [],
        doors: [],
        enemies: [],
    },
    {
        // 第二关：子弹时间教学 — 需要在空中悬停箭再跳上去
        name: '第二关：悬停',
        playerStart: { x: 100, y: 480 },
        platforms: [
            { x: 0, y: 560, w: 500, h: 80 },
            { x: 700, y: 360, w: 324, h: 30 },  // 高台
        ],
        goal: { x: 950, y: 320 },
        hint: '按 K 开启子弹时间，射箭悬停在空中，跳上去！',
        walls: [],
        pressurePlates: [],
        doors: [],
        enemies: [],
    },
    {
        // 第三关：压力板机关 — 用箭触发压力板开门
        name: '第三关：机关',
        playerStart: { x: 100, y: 480 },
        platforms: [
            { x: 0, y: 560, w: 1024, h: 80 },
        ],
        goal: { x: 950, y: 460 },
        hint: '用箭射中压力板来打开大门！',
        walls: [],
        pressurePlates: [
            { x: 600, y: 540, w: 60, h: 20, doorIndex: 0 },
        ],
        doors: [
            { x: 850, y: 460, w: 30, h: 100 },
        ],
        enemies: [],
    },
    {
        // 第四关：多箭协同 — 子弹时间内布置多支箭同时触发两个压力板
        name: '第四关：协同',
        playerStart: { x: 100, y: 480 },
        platforms: [
            { x: 0, y: 560, w: 1024, h: 80 },
        ],
        goal: { x: 950, y: 460 },
        hint: '子弹时间中射出多支箭，同时触发两个压力板！',
        walls: [],
        pressurePlates: [
            { x: 400, y: 540, w: 60, h: 20, doorIndex: 0 },
            { x: 650, y: 540, w: 60, h: 20, doorIndex: 0 },
        ],
        doors: [
            { x: 850, y: 460, w: 30, h: 100 },
        ],
        enemies: [],
    },
    {
        // 第五关：敌人 + 综合
        name: '第五关：综合',
        playerStart: { x: 100, y: 480 },
        platforms: [
            { x: 0, y: 560, w: 400, h: 80 },
            { x: 600, y: 560, w: 424, h: 80 },
            { x: 300, y: 380, w: 200, h: 30 },
        ],
        goal: { x: 950, y: 520 },
        hint: '消灭敌人，通过机关，到达终点！',
        walls: [
            { x: 400, y: 400, w: 20, h: 160 },
            { x: 580, y: 400, w: 20, h: 160 },
        ],
        pressurePlates: [
            { x: 350, y: 360, w: 60, h: 20, doorIndex: 0 },
        ],
        doors: [
            { x: 560, y: 460, w: 20, h: 100 },
        ],
        enemies: [
            { x: 750, y: 520, patrol: [700, 950] },
        ],
    },
];

// ---------- 主场景 ----------
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.currentLevel = 0;
    }

    create() {
        // 物理世界
        this.physics.world.setBounds(0, 0, GAME_W, GAME_H);
        this.physics.world.gravity.y = 900;

        // 输入
        this.keys = this.input.keyboard.addKeys({
            W: 'W', A: 'A', S: 'S', D: 'D',
            J: 'J', K: 'K',
        });

        // 组
        this.platforms = this.physics.add.staticGroup();
        this.wallGroup = this.physics.add.staticGroup();
        this.arrows = this.physics.add.group({ allowGravity: false });
        this.plateGroup = this.physics.add.staticGroup();
        this.doorGroup = this.physics.add.staticGroup();
        this.enemyGroup = this.physics.add.group();

        // 状态
        this.bulletTime = false;
        this.bulletTimeRemaining = 0;
        this.bulletTimeDuration = 10000; // 10 秒
        this.shootCooldown = 0;
        this.shootCooldownMax = 2000; // 2 秒
        this.frozenArrows = []; // 子弹时间中被冻结的箭

        // 加载关卡
        this.loadLevel(this.currentLevel);

        // 碰撞
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.wallGroup);
        this.physics.add.collider(this.player, this.doorGroup);
        this.physics.add.collider(this.arrows, this.platforms, this.arrowHitPlatform, null, this);
        this.physics.add.collider(this.arrows, this.wallGroup, this.arrowHitPlatform, null, this);
        this.physics.add.overlap(this.arrows, this.plateGroup, this.arrowHitPlate, null, this);
        this.physics.add.overlap(this.player, this.goalZone, this.reachGoal, null, this);
        this.physics.add.collider(this.player, this.arrows);
        this.physics.add.overlap(this.arrows, this.enemyGroup, this.arrowHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.playerHitEnemy, null, this);
        this.physics.add.collider(this.enemyGroup, this.platforms);
        this.physics.add.collider(this.enemyGroup, this.wallGroup);
        this.physics.add.collider(this.enemyGroup, this.doorGroup);

        // UI
        this.createUI();
    }

    // ---------- 关卡加载 ----------
    loadLevel(index) {
        const lvl = LEVELS[index];
        // 清理
        this.platforms.clear(true, true);
        this.wallGroup.clear(true, true);
        this.arrows.clear(true, true);
        this.plateGroup.clear(true, true);
        this.doorGroup.clear(true, true);
        this.enemyGroup.clear(true, true);
        this.frozenArrows = [];
        this.bulletTime = false;
        this.bulletTimeRemaining = 0;
        this.shootCooldown = 0;
        this.activePlates = new Set();
        this.doorData = [];
        this.plateData = [];

        // 平台
        lvl.platforms.forEach(p => {
            const plat = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x4a6741);
            this.platforms.add(plat);
            plat.body.updateFromGameObject();
        });

        // 墙
        (lvl.walls || []).forEach(w => {
            const wall = this.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x666666);
            this.wallGroup.add(wall);
            wall.body.updateFromGameObject();
        });

        // 压力板
        (lvl.pressurePlates || []).forEach((pp, i) => {
            const plate = this.add.rectangle(pp.x + pp.w / 2, pp.y + pp.h / 2, pp.w, pp.h, 0xffaa00);
            this.plateGroup.add(plate);
            plate.body.updateFromGameObject();
            plate.setData('doorIndex', pp.doorIndex);
            plate.setData('plateIndex', i);
            this.plateData.push({ obj: plate, doorIndex: pp.doorIndex, triggered: false });
        });

        // 门
        (lvl.doors || []).forEach((d, i) => {
            const door = this.add.rectangle(d.x + d.w / 2, d.y + d.h / 2, d.w, d.h, 0xcc3333);
            this.doorGroup.add(door);
            door.body.updateFromGameObject();
            this.doorData.push({ obj: door, requiredPlates: 0, activatedPlates: 0 });
        });

        // 统计每个门需要几个压力板
        this.plateData.forEach(pd => {
            if (this.doorData[pd.doorIndex]) {
                this.doorData[pd.doorIndex].requiredPlates++;
            }
        });

        // 敌人
        (lvl.enemies || []).forEach(e => {
            const enemy = this.add.rectangle(e.x, e.y, 30, 30, 0xff4444);
            this.physics.add.existing(enemy);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setBounce(0);
            enemy.setData('patrol', e.patrol);
            enemy.setData('dir', 1);
            enemy.body.setVelocityX(80);
            this.enemyGroup.add(enemy);
        });

        // 玩家
        if (this.player) this.player.destroy();
        this.player = this.add.rectangle(lvl.playerStart.x, lvl.playerStart.y, 28, 40, 0x3399ff);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(600);

        // 终点
        if (this.goalZone) this.goalZone.destroy();
        this.goalZone = this.add.rectangle(lvl.goal.x, lvl.goal.y, 40, 40, 0x00ff88, 0.6);
        this.physics.add.existing(this.goalZone, true);

        // 重新设置碰撞（因为对象重建了）
        this.physics.world.colliders.destroy();
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.wallGroup);
        this.physics.add.collider(this.player, this.doorGroup);
        this.physics.add.collider(this.arrows, this.platforms, this.arrowHitPlatform, null, this);
        this.physics.add.collider(this.arrows, this.wallGroup, this.arrowHitPlatform, null, this);
        this.physics.add.overlap(this.arrows, this.plateGroup, this.arrowHitPlate, null, this);
        this.physics.add.overlap(this.player, this.goalZone, this.reachGoal, null, this);
        this.physics.add.collider(this.player, this.arrows);
        this.physics.add.overlap(this.arrows, this.enemyGroup, this.arrowHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.playerHitEnemy, null, this);
        this.physics.add.collider(this.enemyGroup, this.platforms);
        this.physics.add.collider(this.enemyGroup, this.wallGroup);
        this.physics.add.collider(this.enemyGroup, this.doorGroup);
    }

    // ---------- UI ----------
    createUI() {
        this.levelText = this.add.text(16, 16, '', {
            fontSize: '18px', fill: '#ffffff', fontFamily: 'Microsoft YaHei, sans-serif'
        }).setScrollFactor(0).setDepth(100);

        this.hintText = this.add.text(GAME_W / 2, 60, '', {
            fontSize: '14px', fill: '#ffdd88', fontFamily: 'Microsoft YaHei, sans-serif',
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.cooldownBar = this.add.graphics().setScrollFactor(0).setDepth(100);
        this.bulletTimeBar = this.add.graphics().setScrollFactor(0).setDepth(100);

        this.controlsText = this.add.text(GAME_W / 2, GAME_H - 20, 'AD移动 W跳跃 | J射箭 | K子弹时间 | R重开', {
            fontSize: '12px', fill: '#999999', fontFamily: 'Microsoft YaHei, sans-serif',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        // 子弹时间全屏滤色
        this.btOverlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0000ff, 0)
            .setScrollFactor(0).setDepth(50);

        // R 键重开
        this.input.keyboard.on('keydown-R', () => {
            this.loadLevel(this.currentLevel);
        });

        // K 键切换子弹时间
        this.input.keyboard.on('keydown-K', () => {
            if (this.bulletTime) {
                this.endBulletTime();
            } else {
                this.startBulletTime();
            }
        });

        // J 键射箭
        this.input.keyboard.on('keydown-J', () => {
            this.shootArrow();
        });
    }

    // ---------- 射箭 ----------
    shootArrow() {
        if (this.shootCooldown > 0) return;

        const pointer = this.input.activePointer;
        const pointerX = pointer.x + this.cameras.main.scrollX;
        // 根据鼠标在玩家左侧还是右侧决定方向，水平发射
        const dir = pointerX >= this.player.x ? 1 : -1;

        const speed = 500;
        const vx = dir * speed;
        const vy = 0;

        // 创建箭矢（矩形）
        const arrow = this.add.rectangle(this.player.x, this.player.y - 5, 24, 6, 0xffcc00);
        this.physics.add.existing(arrow);
        arrow.body.setVelocity(vx, vy);
        arrow.body.setAllowGravity(false);
        arrow.body.setBounce(0);
        arrow.body.setSize(24, 6);
        arrow.setData('stuck', false);
        arrow.setData('frozen', false);
        arrow.setData('savedVx', vx);
        arrow.setData('savedVy', vy);
        arrow.setRotation(dir > 0 ? 0 : Math.PI);

        this.arrows.add(arrow);

        // 如果处于子弹时间，立即冻结
        if (this.bulletTime) {
            arrow.body.setVelocity(0, 0);
            arrow.body.setAllowGravity(false);
            arrow.setData('frozen', true);
            this.frozenArrows.push(arrow);
        }

        this.shootCooldown = this.shootCooldownMax;
    }

    // ---------- 子弹时间 ----------
    startBulletTime() {
        this.bulletTime = true;
        this.bulletTimeRemaining = this.bulletTimeDuration;
        this.btOverlay.setAlpha(0.08);

        // 冻结所有已存在的运动箭
        this.arrows.getChildren().forEach(arrow => {
            if (!arrow.getData('stuck') && !arrow.getData('frozen')) {
                arrow.setData('savedVx', arrow.body.velocity.x);
                arrow.setData('savedVy', arrow.body.velocity.y);
                arrow.body.setVelocity(0, 0);
                arrow.body.setAllowGravity(false);
                arrow.setData('frozen', true);
                this.frozenArrows.push(arrow);
            }
        });

        // 冻结敌人
        this.enemyGroup.getChildren().forEach(enemy => {
            enemy.setData('savedVx', enemy.body.velocity.x);
            enemy.body.setVelocityX(0);
        });
    }

    endBulletTime() {
        this.bulletTime = false;
        this.bulletTimeRemaining = 0;
        this.btOverlay.setAlpha(0);

        // 恢复所有冻结箭矢
        this.frozenArrows.forEach(arrow => {
            if (arrow.active && !arrow.getData('stuck')) {
                arrow.body.setVelocity(arrow.getData('savedVx'), arrow.getData('savedVy'));
                arrow.body.setAllowGravity(false);
                arrow.setData('frozen', false);
            }
        });
        this.frozenArrows = [];

        // 恢复敌人
        this.enemyGroup.getChildren().forEach(enemy => {
            enemy.body.setVelocityX(enemy.getData('savedVx') || 80);
        });
    }

    // ---------- 碰撞回调 ----------
    arrowHitPlatform(arrow, platform) {
        if (arrow.getData('stuck') || arrow.getData('frozen')) return;
        // 箭矢插入变为静态平台
        arrow.body.setVelocity(0, 0);
        arrow.body.setAllowGravity(false);
        arrow.body.setImmovable(true);
        arrow.setData('stuck', true);
        // 让箭可以被站立
        arrow.body.checkCollision.down = false; // 不阻挡从下方跳上来
    }

    arrowHitPlate(arrow, plate) {
        const pi = plate.getData('plateIndex');
        const pd = this.plateData[pi];
        if (!pd || pd.triggered) return;
        pd.triggered = true;
        plate.fillColor = 0x88ff00; // 变色表示触发

        const di = pd.doorIndex;
        if (this.doorData[di]) {
            this.doorData[di].activatedPlates++;
            if (this.doorData[di].activatedPlates >= this.doorData[di].requiredPlates) {
                // 开门
                const door = this.doorData[di].obj;
                door.setAlpha(0.2);
                door.body.enable = false;
            }
        }
    }

    arrowHitEnemy(arrow, enemy) {
        enemy.destroy();
    }

    playerHitEnemy(player, enemy) {
        // 玩家死亡，重开
        this.loadLevel(this.currentLevel);
    }

    reachGoal(player, goal) {
        this.currentLevel++;
        if (this.currentLevel >= LEVELS.length) {
            this.currentLevel = 0;
            this.add.text(GAME_W / 2, GAME_H / 2, '🎉 恭喜通关！', {
                fontSize: '36px', fill: '#ffffff', fontFamily: 'Microsoft YaHei, sans-serif',
            }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(2000, () => this.loadLevel(0));
        } else {
            this.loadLevel(this.currentLevel);
        }
    }

    // ---------- 主循环 ----------
    update(time, delta) {
        const body = this.player.body;

        // 移动
        const speed = 220;
        if (this.keys.A.isDown) {
            body.setVelocityX(-speed);
        } else if (this.keys.D.isDown) {
            body.setVelocityX(speed);
        } else {
            body.setVelocityX(0);
        }

        // 跳跃
        if (this.keys.W.isDown && body.blocked.down) {
            body.setVelocityY(-420);
        }

        // 射箭冷却
        if (this.shootCooldown > 0) {
            this.shootCooldown -= delta;
        }

        // 子弹时间倒计时
        if (this.bulletTime) {
            this.bulletTimeRemaining -= delta;
            if (this.bulletTimeRemaining <= 0) {
                this.endBulletTime();
            }
        }

        // 敌人巡逻 AI（非子弹时间）
        if (!this.bulletTime) {
            this.enemyGroup.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const patrol = enemy.getData('patrol');
                if (!patrol) return;
                if (enemy.x <= patrol[0]) {
                    enemy.setData('dir', 1);
                    enemy.body.setVelocityX(80);
                } else if (enemy.x >= patrol[1]) {
                    enemy.setData('dir', -1);
                    enemy.body.setVelocityX(-80);
                }
            });
        }

        // 更新箭矢旋转（运动中的）
        this.arrows.getChildren().forEach(arrow => {
            if (!arrow.getData('stuck') && !arrow.getData('frozen') && arrow.active) {
                arrow.setRotation(Math.atan2(arrow.body.velocity.y, arrow.body.velocity.x));
            }
        });

        // ---------- 更新 UI ----------
        const lvl = LEVELS[this.currentLevel];
        if (this.levelText) {
            this.levelText.setText(lvl.name);
        }
        if (this.hintText) {
            this.hintText.setText(lvl.hint || '');
        }

        // 射箭冷却条
        if (this.cooldownBar) {
            this.cooldownBar.clear();
            this.cooldownBar.fillStyle(0x333333, 0.8);
            this.cooldownBar.fillRect(16, 46, 120, 10);
            if (this.shootCooldown > 0) {
                const pct = this.shootCooldown / this.shootCooldownMax;
                this.cooldownBar.fillStyle(0xff8800, 1);
                this.cooldownBar.fillRect(16, 46, 120 * pct, 10);
            } else {
                this.cooldownBar.fillStyle(0x00cc44, 1);
                this.cooldownBar.fillRect(16, 46, 120, 10);
            }
        }

        // 子弹时间条
        if (this.bulletTimeBar) {
            this.bulletTimeBar.clear();
            if (this.bulletTime) {
                this.bulletTimeBar.fillStyle(0x333333, 0.8);
                this.bulletTimeBar.fillRect(16, 62, 120, 10);
                const pct = this.bulletTimeRemaining / this.bulletTimeDuration;
                this.bulletTimeBar.fillStyle(0x4488ff, 1);
                this.bulletTimeBar.fillRect(16, 62, 120 * pct, 10);
            }
        }
    }
}

// ---------- 游戏配置 ----------
const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false,
        },
    },
    scene: [GameScene],
};

const game = new Phaser.Game(config);
