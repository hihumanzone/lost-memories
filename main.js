// -------------------------------------
// Preloader Scene
// -------------------------------------
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }
  
  preload() {
    const { width, height } = this.cameras.main;
    
    // Create loading UI.
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
    
    // Load images.
    this.load.image('mainMenu', 'assets/main_menu.png');
    this.load.image('mainBanner', 'assets/main_banner.png');
    this.load.image('playButton', 'assets/play_button.png');
    this.load.image('myRoom', 'assets/my_room.png');
    this.load.image('garden', 'assets/garden.png');
    
    // Jack sprite: a spritesheet with 4 frames.
    this.load.spritesheet('jack', 'assets/jack.png', { frameWidth: 64, frameHeight: 64 });
    
    // Load audio tracks.
    this.load.audio('menuMusic', ['assets/music/menu.mp3']);
    this.load.audio('roomMusic', ['assets/music/room.mp3']);
    this.load.audio('gardenMusic', ['assets/music/garden.mp3']);
    
    // Load sound effects.
    this.load.audio('button', ['assets/sfx/button.mp3']);
    this.load.audio('door', ['assets/sfx/door.mp3']);
    this.load.audio('walking', ['assets/sfx/walking.mp3']);
  }
  
  create() {
    this.scene.start('MainMenuScene');
  }
}

// -------------------------------------
// BaseScene (Common helpers for controls, movement, and player)
// -------------------------------------
class BaseScene extends Phaser.Scene {
  createMobileButton(x, y, label, controlName) {
    const buttonStyle = {
      font: '16px Arial',
      fill: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fixedWidth: 60,
      fixedHeight: 60,
      align: 'center',
      padding: { top: 15 },
      stroke: '#ffffff',
      strokeThickness: 10
    };
    
    const button = this.add.text(x, y, label, buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();
    
    // Assign a unique pointer ID to track this specific touch
    button.touchId = null;
    
    button.on('pointerdown', (pointer) => {
      this.sound.play('button');
      button.touchId = pointer.id; // Store the pointer ID
      this.mobileControls[controlName] = true;
    });
    
    button.on('pointerup', (pointer) => {
      if (button.touchId === pointer.id) { // Only respond if it's the same pointer
        this.mobileControls[controlName] = false;
        button.touchId = null;
      }
    });
    
    button.on('pointerout', (pointer) => {
      if (button.touchId === pointer.id) { // Only respond if it's the same pointer
        this.mobileControls[controlName] = false;
        button.touchId = null;
      }
    });
    
    return button;
  }
  
  createMobileControls() {
    this.mobileControls = { up: false, down: false, left: false, right: false, jump: false };
    const offset = 60;
    const baseX = 100,
      baseY = this.sys.game.config.height - 100;
    
    this.createMobileButton(baseX, baseY - offset, '▲', 'up');
    this.createMobileButton(baseX, baseY + offset, '▼', 'down');
    this.createMobileButton(baseX - offset, baseY, '◀', 'left');
    this.createMobileButton(baseX + offset, baseY, '▶', 'right');
    
    const jumpX = this.sys.game.config.width - 80,
      jumpY = this.sys.game.config.height - 100;
    this.createMobileButton(jumpX, jumpY, '🆙', 'jump');
  }
  
  initPlayerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isJumping = false;
  }
  
  createPlayer(x, y, spriteKey = 'jack') {
    const player = this.physics.add.sprite(x, y, spriteKey);
    player.setScale(2);
    player.setSize(64, 64);
    player.setCollideWorldBounds(true);
    return player;
  }
  
  updatePlayerMovement(player) {
    const speed = 240;
    let velocityX = 0,
      velocityY = 0;
    
    if (this.cursors) {
      if (this.cursors.left.isDown) velocityX = -speed;
      else if (this.cursors.right.isDown) velocityX = speed;
      if (this.cursors.up.isDown) velocityY = -speed;
      else if (this.cursors.down.isDown) velocityY = speed;
    }
    
    if (this.mobileControls) {
      if (this.mobileControls.left) velocityX = -speed;
      else if (this.mobileControls.right) velocityX = speed;
      if (this.mobileControls.up) velocityY = -speed;
      else if (this.mobileControls.down) velocityY = speed;
    }
    
    player.setVelocity(velocityX, velocityY);
    
    // Adjust frame based on movement direction.
    if (velocityX < 0) player.setFrame(1);
    else if (velocityX > 0) player.setFrame(2);
    else if (velocityY < 0) player.setFrame(3);
    else if (velocityY > 0) player.setFrame(0);
    
    // Wiggle effect
    if (velocityX !== 0 || velocityY !== 0) {
      if (!player.wiggleTween) {
        player.wiggleTween = this.tweens.add({
          targets: player,
          angle: { from: -5, to: 5 },
          duration: 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else {
      if (player.wiggleTween) {
        player.wiggleTween.stop();
        player.wiggleTween = null;
        player.angle = 0;
      }
    }
  }
  
  
  handlePlayerJump(player) {
    if (
      (Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
        (this.mobileControls && this.mobileControls.jump)) &&
      !this.isJumping
    ) {
      this.isJumping = true;
      if (this.mobileControls) this.mobileControls.jump = false;
      
      const originalY = player.y;
      this.tweens.add({
        targets: player,
        y: originalY - 40,
        duration: 200,
        ease: 'Power1',
        onComplete: () => {
          this.tweens.add({
            targets: player,
            y: originalY,
            duration: 150,
            ease: 'Bounce.easeOut',
            onComplete: () => { this.isJumping = false; }
          });
        }
      });
    }
  }
  
  updatePlayerAndSound(player, walkingSound) {
    this.updatePlayerMovement(player);
    this.handlePlayerJump(player);
    const moving = player.body.velocity.x !== 0 || player.body.velocity.y !== 0;
    if (moving && !walkingSound.isPlaying) walkingSound.play();
    else if (!moving && walkingSound.isPlaying) walkingSound.stop();
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
    
    // Background and banner.
    this.add.image(0, 0, 'mainMenu')
      .setOrigin(0, 0)
      .setDisplaySize(width, height);
    this.add.image(width / 2, 250, 'mainBanner').setOrigin(0.5);
    
    // Play button.
    const playButton = this.add.image(width / 2, height - 100, 'playButton')
      .setInteractive()
      .setOrigin(0.5);
    
    this.menuMusic = this.sound.add('menuMusic', { loop: true, volume: 0.5 });
    this.menuMusic.play();
    
    playButton.on('pointerdown', () => {
      this.sound.play('button');
      this.menuMusic.stop();
      this.cameras.main.fadeOut(1000);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MyRoomScene');
      });
    });
    
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
    
    this.roomMusic = this.sound.add('roomMusic', { loop: true, volume: 0.5 });
    this.roomMusic.play();
    
    this.add.image(0, 0, 'myRoom')
      .setOrigin(0, 0)
      .setDisplaySize(width, height);
    
    this.player = this.createPlayer(100, height / 2);
    this.initPlayerControls();
    if (!this.sys.game.device.os.desktop) {
      this.createMobileControls();
    }
    
    this.walkingSound = this.sound.add('walking', { loop: true, volume: 0.6 });
    
    const buttonStyle = {
      font: '18px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
      stroke: '#ff0000',
      strokeThickness: 2
    };
    
    // "Leave Room?" button
    this.leaveButton = this.add.text(width / 2, height - 60, "Leave Room?", buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();
    
    this.leaveButton.on('pointerdown', () => {
      this.sound.play('door');
      this.roomMusic.stop();
      this.cameras.main.fadeOut(1000);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MyGardenScene', { playerX: 500, playerY: 500 });
      });
    });
    this.leaveButton.visible = false;
    
    this.cameras.main.fadeIn(1000);
  }
  
  update() {
    const { width, height } = this.sys.game.config;
    this.updatePlayerAndSound(this.player, this.walkingSound);
    
    // Show the button when the player is near the bottom–middle.
    this.leaveButton.visible = (
      this.player.x > width / 2 - 50 &&
      this.player.x < width / 2 + 50 &&
      this.player.y > height - 100
    );
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
    
    this.gardenMusic = this.sound.add('gardenMusic', { loop: true, volume: 0.5 });
    this.gardenMusic.play();
    
    this.gardenImage = this.add.image(0, 0, 'garden').setOrigin(0, 0);
    this.physics.world.setBounds(0, 0, this.gardenImage.width, this.gardenImage.height);
    this.cameras.main.setBounds(0, 0, this.gardenImage.width, this.gardenImage.height);
    
    this.player = this.createPlayer(this.startX, this.startY);
    this.cameras.main.startFollow(this.player);
    
    this.initPlayerControls();
    if (!this.sys.game.device.os.desktop) {
      this.createMobileControls();
    }
    this.walkingSound = this.sound.add('walking', { loop: true, volume: 0.6 });
    
    const buttonStyle = {
      font: '18px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
      stroke: '#ff0000',
      strokeThickness: 2
    };
    
    // "Enter the Room" button
    this.returnButton = this.add.text(width / 2, height - 60, "Enter the Room", buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();
    
    this.returnButton.on('pointerdown', () => {
      this.sound.play('door');
      this.gardenMusic.stop();
      this.cameras.main.fadeOut(1000);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MyRoomScene');
      });
    });
    this.returnButton.visible = false;
    
    this.cameras.main.fadeIn(1000);
  }
  
  update() {
    this.updatePlayerAndSound(this.player, this.walkingSound);
    
    const margin = 50;
    const centerX = this.gardenImage.width / 2;
    const centerY = this.gardenImage.height / 2;
    
    // Show the button when the player is near the center.
    this.returnButton.visible = (
      Math.abs(this.player.x - centerX) < margin &&
      Math.abs(this.player.y - centerY) < margin
    );
  }
}

// -------------------------------------
// Game Configuration and Initialization
// -------------------------------------
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT },
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PreloaderScene, MainMenuScene, MyRoomScene, MyGardenScene]
};

const game = new Phaser.Game(config);