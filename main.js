// -------------------------------------
// Preloader Scene
// -------------------------------------
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }
  
  preload() {
    const { width, height } = this.cameras.main;
    
    // Draw loading UI.
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const progressBar = this.add.graphics();
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: { font: '20px monospace', fill: '#ffffff' }
    });
    loadingText.setOrigin(0.5);
    
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
    
    // Jack sprite: a 128×128 image split into 4 frames (each 64×64).
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
// BaseScene (Common helpers for mobile buttons, transitions, and player control)
// -------------------------------------
class BaseScene extends Phaser.Scene {
  createMobileButton(centerX, centerY, label, controlName) {
    const buttonWidth = 50,
      buttonHeight = 50;
    
    let container = this.add.container(centerX - buttonWidth / 2, centerY - buttonHeight / 2);
    container.setScrollFactor(0);
    
    let bg = this.add.rectangle(buttonWidth / 2, buttonHeight / 2, buttonWidth, buttonHeight, 0x000000, 0.5);
    bg.setStrokeStyle(2, 0xffffff);
    
    let text = this.add.text(buttonWidth / 2, buttonHeight / 2, label, { font: '16px Arial', fill: '#ffffff' });
    text.setOrigin(0.5);
    
    container.add([bg, text]);
    container.setSize(buttonWidth, buttonHeight);
    
    container.setInteractive(new Phaser.Geom.Rectangle(25, 25, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    
    // Play the 'button' sound effect on mobile button press.
    container.on('pointerdown', () => { 
      this.sound.play('button');
      this.mobileControls[controlName] = true; 
    });
    container.on('pointerup', () => { this.mobileControls[controlName] = false; });
    container.on('pointerout', () => { this.mobileControls[controlName] = false; });
    
    return container;
  }
  
  createMobileControls() {
    this.mobileControls = { up: false, down: false, left: false, right: false, jump: false };
    const offset = 50;
    const baseX = 100,
      baseY = this.sys.game.config.height - 100;
    
    this.createMobileButton(baseX, baseY - offset, 'Up', 'up');
    this.createMobileButton(baseX, baseY + offset, 'Down', 'down');
    this.createMobileButton(baseX - offset, baseY, 'Left', 'left');
    this.createMobileButton(baseX + offset, baseY, 'Right', 'right');
    
    const jumpX = this.sys.game.config.width - 80,
      jumpY = this.sys.game.config.height - 100;
    this.createMobileButton(jumpX, jumpY, 'Jump', 'jump');
  }
  
  initPlayerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isJumping = false;
  }
  
  updatePlayerMovement(player) {
    const speed = 240;
    let velocityX = 0,
      velocityY = 0;
    
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        velocityX = -speed;
      } else if (this.cursors.right.isDown) {
        velocityX = speed;
      }
      if (this.cursors.up.isDown) {
        velocityY = -speed;
      } else if (this.cursors.down.isDown) {
        velocityY = speed;
      }
    }
    
    if (this.mobileControls) {
      if (this.mobileControls.left) {
        velocityX = -speed;
      } else if (this.mobileControls.right) {
        velocityX = speed;
      }
      if (this.mobileControls.up) {
        velocityY = -speed;
      } else if (this.mobileControls.down) {
        velocityY = speed;
      }
    }
    
    player.setVelocity(velocityX, velocityY);
    
    if (velocityX < 0) {
      player.setFrame(1);
    } else if (velocityX > 0) {
      player.setFrame(2);
    } else if (velocityY < 0) {
      player.setFrame(3);
    } else if (velocityY > 0) {
      player.setFrame(0);
    }
  }
  
  handlePlayerJump(player) {
    if (
      (Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
        (this.mobileControls && this.mobileControls.jump)) &&
      !this.isJumping
    ) {
      this.isJumping = true;
      if (this.mobileControls) {
        this.mobileControls.jump = false;
      }
      
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
    
    // Background image.
    this.add.image(0, 0, 'mainMenu')
      .setOrigin(0, 0)
      .setDisplaySize(width, height);
    
    const banner = this.add.image(width / 2, 250, 'mainBanner').setOrigin(0.5);
    
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
    
    this.player = this.physics.add.sprite(100, height / 2, 'jack');
    this.player.setScale(2);
    this.player.setSize(64, 64);
    this.player.setCollideWorldBounds(true);
    
    this.initPlayerControls();
    if (!this.sys.game.device.os.desktop) {
      this.createMobileControls();
    }
    
    // Pre-create walking sound effect (looped) for movement.
    this.walkingSound = this.sound.add('walking', { loop: true, volume: 0.3 });
    
    // "Leave Room?" button.
    this.leaveButton = this.add.text(width / 2, height - 60, "Leave Room?", {
      font: '18px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setInteractive();
    
    // Use 'door' sound effect for the Leave Room button.
    this.leaveButton.on('pointerdown', () => { 
      this.sound.play('door');
      this.showDoorPrompt(); 
    });
    this.leaveButton.visible = false;
    
    this.cameras.main.fadeIn(1000);
  }
  
  showDoorPrompt() {
    const { width, height } = this.sys.game.config;
    const overlay = this.add.rectangle(width / 2, height / 2, 300, 150, 0x000000, 0.7).setOrigin(0.5);
    const promptText = this.add.text(width / 2, height / 2 - 30, 'Leave Room?', {
      font: '20px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);
    
    const yesButton = this.add.text(width / 2 - 50, height / 2 + 20, 'Yes', {
      font: '18px Arial',
      fill: '#00ff00'
    }).setOrigin(0.5).setInteractive();
    
    const noButton = this.add.text(width / 2 + 50, height / 2 + 20, 'No', {
      font: '18px Arial',
      fill: '#ff0000'
    }).setOrigin(0.5).setInteractive();
    
    yesButton.on('pointerdown', () => {
      this.sound.play('button');
      overlay.destroy();
      promptText.destroy();
      yesButton.destroy();
      noButton.destroy();
      this.roomMusic.stop();
      this.cameras.main.fadeOut(1000);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MyGardenScene', { playerX: 500, playerY: 500 });
      });
    });
    
    noButton.on('pointerdown', () => {
      this.sound.play('button');
      overlay.destroy();
      promptText.destroy();
      yesButton.destroy();
      noButton.destroy();
    });
  }
  
  update() {
    const { width, height } = this.sys.game.config;
    
    this.updatePlayerMovement(this.player);
    this.handlePlayerJump(this.player);
    
    // Update walking sound based on movement.
    const moving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
    if (moving && !this.walkingSound.isPlaying) {
      this.walkingSound.play();
    } else if (!moving && this.walkingSound.isPlaying) {
      this.walkingSound.stop();
    }
    
    // Show "Leave Room?" button when player is near the bottom–middle.
    if (this.player.x > width / 2 - 50 && this.player.x < width / 2 + 50 && this.player.y > height - 100) {
      this.leaveButton.visible = true;
    } else {
      this.leaveButton.visible = false;
    }
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
    
    this.player = this.physics.add.sprite(this.startX, this.startY, 'jack');
    this.player.setScale(2);
    this.player.setSize(64, 64);
    this.player.setCollideWorldBounds(true);
    
    this.cameras.main.startFollow(this.player);
    
    this.initPlayerControls();
    if (!this.sys.game.device.os.desktop) {
      this.createMobileControls();
    }
    
    // Pre-create walking sound effect for movement.
    this.walkingSound = this.sound.add('walking', { loop: true, volume: 0.3 });
    
    // "Return to Room" button.
    this.returnButton = this.add.text(width / 2, height - 60, "Return to Room", {
      font: '18px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000'
    })
    .setScrollFactor(0)
    .setInteractive();
    
    // Use 'door' sound effect for the Return to Room button.
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
    this.updatePlayerMovement(this.player);
    this.handlePlayerJump(this.player);
    
    // Update walking sound based on movement.
    const moving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
    if (moving && !this.walkingSound.isPlaying) {
      this.walkingSound.play();
    } else if (!moving && this.walkingSound.isPlaying) {
      this.walkingSound.stop();
    }
    
    const margin = 50;
    const centerX = this.gardenImage.width / 2;
    const centerY = this.gardenImage.height / 2;
    
    // Show "Return to Room" button when player is near the center.
    if (Math.abs(this.player.x - centerX) < margin && Math.abs(this.player.y - centerY) < margin) {
      this.returnButton.visible = true;
    } else {
      this.returnButton.visible = false;
    }
  }
}

// -------------------------------------
// Game Configuration and Initialization
// -------------------------------------
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PreloaderScene, MainMenuScene, MyRoomScene, MyGardenScene]
};

const game = new Phaser.Game(config);
