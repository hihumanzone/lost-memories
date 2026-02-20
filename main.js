// -------------------------------------
// Constants & Configuration
// -------------------------------------
const GAME_CONFIG = {
  width: 800,
  height: 600,
  playerSpeed: 240,
  playerScale: 2,
  playerBodyRadius: 14,
  jumpHeight: 40,
  jumpDuration: 200,
  wallSegmentSize: 8,
  musicVolume: 0.5,
  sfxVolume: 0.6
};

const BUTTON_STYLES = {
  mobile: {
    font: '16px Arial',
    fill: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    fixedWidth: 60,
    fixedHeight: 60,
    align: 'center',
    padding: { top: 15 },
    stroke: '#ffffff',
    strokeThickness: 10
  },
  action: {
    font: '18px Arial',
    fill: '#ffffff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 },
    stroke: '#ff0000',
    strokeThickness: 2
  }
};

// -------------------------------------
// Preloader Scene
// -------------------------------------
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }

  preload() {
    this.createLoadingUI();
    this.loadAssets();
  }

  createLoadingUI() {
    const { width, height } = this.cameras.main;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: { font: '20px monospace', fill: '#ffffff' }
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  loadAssets() {
    // Images
    this.load.image('mainMenu', 'assets/main_menu.png');
    this.load.image('mainBanner', 'assets/main_banner.png');
    this.load.image('playButton', 'assets/play_button.png');
    this.load.image('myRoom', 'assets/my_room.png');
    this.load.image('garden', 'assets/garden.png');

    // Spritesheets
    this.load.spritesheet('jack', 'assets/jack.png', {
      frameWidth: 64,
      frameHeight: 64
    });

    // Audio
    this.load.audio('menuMusic', ['assets/music/menu.mp3']);
    this.load.audio('roomMusic', ['assets/music/room.mp3']);
    this.load.audio('gardenMusic', ['assets/music/garden.mp3']);
    this.load.audio('button', ['assets/sfx/button.mp3']);
    this.load.audio('door', ['assets/sfx/door.mp3']);
    this.load.audio('walking', ['assets/sfx/walking.mp3']);

    // Collision data
    this.load.json('roomData', 'assets/my_room.json');
    this.load.json('gardenData', 'assets/garden.json');
  }

  create() {
    this.scene.start('MainMenuScene');
  }
}

// -------------------------------------
// Base Scene
// -------------------------------------
class BaseScene extends Phaser.Scene {
  /**
   * Initializes player control systems
   */
  initPlayerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isJumping = false;
    this.mobileControls = null;

    if (!this.sys.game.device.os.desktop) {
      this.createMobileControls();
    }
  }

  /**
   * Creates mobile control buttons
   */
  createMobileControls() {
    this.mobileControls = {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false
    };

    const { width, height } = this.sys.game.config;
    const offset = 60;
    const dpadX = 100;
    const dpadY = height - 100;

    // D-pad buttons
    this.createMobileButton(dpadX, dpadY - offset, '▲', 'up');
    this.createMobileButton(dpadX, dpadY + offset, '▼', 'down');
    this.createMobileButton(dpadX - offset, dpadY, '◀', 'left');
    this.createMobileButton(dpadX + offset, dpadY, '▶', 'right');

    // Jump button
    this.createMobileButton(width - 80, height - 100, '🆙', 'jump');
  }

  /**
   * Creates a single mobile control button
   */
  createMobileButton(x, y, label, controlName) {
    const button = this.add.text(x, y, label, BUTTON_STYLES.mobile)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();

    button.on('pointerdown', () => {
      this.sound.play('button');
      this.mobileControls[controlName] = true;
    });

    button.on('pointerup', () => {
      this.mobileControls[controlName] = false;
    });

    button.on('pointerout', () => {
      this.mobileControls[controlName] = false;
    });

    return button;
  }

  /**
   * Creates and configures a player sprite
   */
  createPlayer(x, y, spriteKey = 'jack') {
    const player = this.physics.add.sprite(x, y, spriteKey);
    player.setScale(GAME_CONFIG.playerScale);
    player.setCollideWorldBounds(true);

    // Circular hitbox for uniform collision
    const frameSize = 64;
    const radius = GAME_CONFIG.playerBodyRadius;
    const offset = (frameSize - radius * 2) / 2;
    player.body.setCircle(radius, offset, offset);

    return player;
  }

  /**
   * Creates a walking sound effect
   */
  createWalkingSound() {
    return this.sound.add('walking', {
      loop: true,
      volume: GAME_CONFIG.sfxVolume
    });
  }

  /**
   * Updates player movement and animations
   */
  updatePlayer(player, walkingSound) {
    const velocity = this.getInputVelocity();

    player.setVelocity(velocity.x, velocity.y);
    this.updatePlayerAnimation(player, velocity);
    this.updateWiggleEffect(player, velocity);
    this.handleJump(player);
    this.updateWalkingSound(walkingSound, velocity);
  }

  /**
   * Gets velocity based on current input state
   */
  getInputVelocity() {
    const speed = GAME_CONFIG.playerSpeed;
    let x = 0;
    let y = 0;

    // Keyboard input
    if (this.cursors.left.isDown) x = -speed;
    else if (this.cursors.right.isDown) x = speed;

    if (this.cursors.up.isDown) y = -speed;
    else if (this.cursors.down.isDown) y = speed;

    // Mobile input (overrides keyboard if active)
    if (this.mobileControls) {
      if (this.mobileControls.left) x = -speed;
      else if (this.mobileControls.right) x = speed;

      if (this.mobileControls.up) y = -speed;
      else if (this.mobileControls.down) y = speed;
    }

    return { x, y };
  }

  /**
   * Updates player sprite frame based on movement direction
   */
  updatePlayerAnimation(player, velocity) {
    if (velocity.x < 0) player.setFrame(1);
    else if (velocity.x > 0) player.setFrame(2);
    else if (velocity.y < 0) player.setFrame(3);
    else if (velocity.y > 0) player.setFrame(0);
  }

  /**
   * Manages the player wiggle animation during movement
   */
  updateWiggleEffect(player, velocity) {
    const isMoving = velocity.x !== 0 || velocity.y !== 0;

    if (isMoving && !player.wiggleTween) {
      player.wiggleTween = this.tweens.add({
        targets: player,
        angle: { from: -5, to: 5 },
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (!isMoving && player.wiggleTween) {
      player.wiggleTween.stop();
      player.wiggleTween = null;
      player.angle = 0;
    }
  }

  /**
   * Handles player jump action
   */
  handleJump(player) {
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
      (this.mobileControls?.jump);

    if (!jumpPressed || this.isJumping) return;

    this.isJumping = true;
    if (this.mobileControls) this.mobileControls.jump = false;

    const originalY = player.y;

    this.tweens.add({
      targets: player,
      y: originalY - GAME_CONFIG.jumpHeight,
      duration: GAME_CONFIG.jumpDuration,
      ease: 'Power1',
      onComplete: () => {
        this.tweens.add({
          targets: player,
          y: originalY,
          duration: 150,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.isJumping = false;
          }
        });
      }
    });
  }

  /**
   * Updates walking sound based on movement state
   */
  updateWalkingSound(walkingSound, velocity) {
    const isMoving = velocity.x !== 0 || velocity.y !== 0;

    if (isMoving && !walkingSound.isPlaying) {
      walkingSound.play();
    } else if (!isMoving && walkingSound.isPlaying) {
      walkingSound.stop();
    }
  }

  /**
   * Creates an action button with standard styling
   */
  createActionButton(x, y, text, callback) {
    const button = this.add.text(x, y, text, BUTTON_STYLES.action)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive()
      .setVisible(false);

    button.on('pointerdown', callback);

    return button;
  }

  /**
   * Starts background music for the scene
   */
  startMusic(key) {
    this.music = this.sound.add(key, {
      loop: true,
      volume: GAME_CONFIG.musicVolume
    });
    this.music.play();
  }

  /**
   * Stops current background music
   */
  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  /**
   * Transitions to another scene with fade effect
   */
  transitionTo(sceneKey, data = {}) {
    this.sound.play('door');
    this.stopMusic();
    this.cameras.main.fadeOut(1000);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  /**
   * Creates collision walls from JSON data
   * @param {string} dataKey - Cache key for the JSON data
   * @param {number} displayWidth - Displayed width of the environment
   * @param {number} displayHeight - Displayed height of the environment
   */
  createWalls(dataKey, displayWidth, displayHeight) {
    const data = this.cache.json.get(dataKey);

    if (!data?.lines?.length) return;

    const { imageResolution, lines } = data;
    const scaleX = displayWidth / imageResolution.width;
    const scaleY = displayHeight / imageResolution.height;

    const segSize = GAME_CONFIG.wallSegmentSize;
    const step = segSize * 0.5;

    this.walls = this.physics.add.staticGroup();

    for (const line of lines) {
      this.createWallSegments(line, scaleX, scaleY, segSize, step);
    }

    this.walls.refresh();
    this.physics.add.collider(this.player, this.walls);
  }

  /**
   * Creates wall segments along a line
   */
  createWallSegments(line, scaleX, scaleY, segSize, step) {
    const sx = line.start.x * scaleX;
    const sy = line.start.y * scaleY;
    const ex = line.end.x * scaleX;
    const ey = line.end.y * scaleY;

    const dx = ex - sx;
    const dy = ey - sy;
    const length = Math.hypot(dx, dy);
    const count = Math.max(1, Math.ceil(length / step));

    for (let i = 0; i <= count; i++) {
      const t = count > 0 ? i / count : 0;
      const x = sx + dx * t;
      const y = sy + dy * t;

      const zone = this.add.zone(x, y, segSize, segSize);
      this.walls.add(zone);
    }
  }
}

// -------------------------------------
// Main Menu Scene
// -------------------------------------
class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    const { width, height } = this.sys.game.config;

    // Background
    this.add.image(0, 0, 'mainMenu')
      .setOrigin(0, 0)
      .setDisplaySize(width, height);

    // Banner
    this.add.image(width / 2, 250, 'mainBanner')
      .setOrigin(0.5);

    // Play button
    const playButton = this.add.image(width / 2, height - 100, 'playButton')
      .setOrigin(0.5)
      .setInteractive();

    playButton.on('pointerdown', () => {
      this.sound.play('button');
      this.stopMusic();
      this.cameras.main.fadeOut(1000);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MyRoomScene');
      });
    });

    this.startMusic('menuMusic');
    this.cameras.main.fadeIn(1000);
  }
}

// -------------------------------------
// My Room Scene
// -------------------------------------
class MyRoomScene extends BaseScene {
  constructor() {
    super('MyRoomScene');
  }

  create() {
    const { width, height } = this.sys.game.config;

    // Background
    this.add.image(0, 0, 'myRoom')
      .setOrigin(0, 0)
      .setDisplaySize(width, height);

    // Player setup
    this.player = this.createPlayer(200, 450);
    this.walkingSound = this.createWalkingSound();
    this.initPlayerControls();

    // Collision walls
    this.createWalls('roomData', width, height);

    // Exit button
    this.leaveButton = this.createActionButton(
      width / 2,
      height - 60,
      'Leave Room?',
      () => this.transitionTo('MyGardenScene', { playerX: 500, playerY: 500 })
    );

    this.startMusic('roomMusic');
    this.cameras.main.fadeIn(1000);
  }

  update() {
    const { width, height } = this.sys.game.config;

    this.updatePlayer(this.player, this.walkingSound);

    // Show exit button when near door
    const nearDoor =
      this.player.x > width / 2 - 50 &&
      this.player.x < width / 2 + 50 &&
      this.player.y > height - 100;

    this.leaveButton.setVisible(nearDoor);
  }
}

// -------------------------------------
// My Garden Scene
// -------------------------------------
class MyGardenScene extends BaseScene {
  constructor() {
    super('MyGardenScene');
  }

  init(data) {
    this.startX = data.playerX || 50;
    this.startY = data.playerY || 50;
  }

  create() {
    const { width, height } = this.sys.game.config;

    // Garden background
    this.gardenImage = this.add.image(0, 0, 'garden').setOrigin(0, 0);

    // World bounds
    const gardenWidth = this.gardenImage.width;
    const gardenHeight = this.gardenImage.height;
    this.physics.world.setBounds(0, 0, gardenWidth, gardenHeight);
    this.cameras.main.setBounds(0, 0, gardenWidth, gardenHeight);

    // Player setup
    this.player = this.createPlayer(this.startX, this.startY);
    this.walkingSound = this.createWalkingSound();
    this.initPlayerControls();
    this.cameras.main.startFollow(this.player);

    // Collision walls
    this.createWalls('gardenData', gardenWidth, gardenHeight);

    // Return button
    this.returnButton = this.createActionButton(
      width / 2,
      height - 60,
      'Enter the Room',
      () => this.transitionTo('MyRoomScene')
    );

    this.startMusic('gardenMusic');
    this.cameras.main.fadeIn(1000);
  }

  update() {
    this.updatePlayer(this.player, this.walkingSound);

    // Show return button when near center
    const margin = 50;
    const centerX = this.gardenImage.width / 2;
    const centerY = this.gardenImage.height / 2;

    const nearCenter =
      Math.abs(this.player.x - centerX) < margin &&
      Math.abs(this.player.y - centerY) < margin;

    this.returnButton.setVisible(nearCenter);
  }
}

// -------------------------------------
// Game Initialization
// -------------------------------------
const config = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [
    PreloaderScene,
    MainMenuScene,
    MyRoomScene,
    MyGardenScene
  ]
};

const game = new Phaser.Game(config);
