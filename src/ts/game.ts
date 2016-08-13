import GameMap from './gameMap';
import MenusInfo from "./menusInfo";
import Enemy from "./enemy";
import Sprite = Phaser.Sprite;
import {LEVELS_COUNT, DEBUG} from "./config";

export default class AmyInSpaceGame {
    private game: Phaser.Game;
    public map:GameMap;
    public menu:MenusInfo;

    private player:Sprite;
    private floors:Sprite[];
    private rocks:Sprite[];
    private boundaries:Sprite[];
    private enemies : Enemy[];
    private stuffToBringUp : Sprite[];
    private gameInfo : Phaser.Text;
    private heartsIcos : Sprite[];
    private diamondsInfo : Phaser.Text;
    private manaInfo : Phaser.Text;
    private skillInfo : Phaser.Text;
    private pointsInfo : Phaser.Text;
    public diamond:Sprite = null;
    private heart:Sprite = null;
    private bg : Phaser.TileSprite;

    private hpLeft : number = 10;
    private manaLeft : number;
    private manaMax : number;
    private currSkill : number = 1;
    private points : number = 0;
    private diamonds : number;
    private level : number = 0;
    private levelData : MapDataFile;
    private thereIsTheGame : boolean;
    public sfx : Phaser.Sound;

    constructor() {
        this.game = new Phaser.Game(800, 600, Phaser.AUTO, 'content', { preload: this.preload, create: this.create, update: this.update });
        this.menu = new MenusInfo(this, this.game);

        setInterval(() => {
            if (this.game.paused) return;

            if (this.manaLeft < this.manaMax)
                this.manaLeft++;
        }, 150);

        if (DEBUG) {
            //Cheats!
            window['cheat'] = (lvlNow) => {
                this.level = lvlNow - 1;
                this.loadNextLevel();
            };
            window['cheatScale'] = (scale) => {
                this.game.world.scale.set(scale, scale);
            }
        }
    }

    //Used by Phaser to preload stuff
    preload = () => {
        this.game.load.image('loader', 'assets/images/sprites/loader.png');

        this.game.load.setPreloadSprite(
            this.game.add.sprite(Math.round(this.game.width / 2 - 250 / 2), Math.round(this.game.height / 2 - 44 / 2), 'loader')
        );

        let spritesheets = {
            'player':['player.png', 33, 35, 12, 0],
            'btn':['btn.png', 80, 57],
            'btn-small':['btn-small.png', 47, 33],
        };

        for (let i = 1; i <= 6; i++)
            spritesheets['zombie' + i] = [i + 'ZombieSpriteSheet.png', 33, 36, 12, 0];

        this.loadFiles('spritesheet', spritesheets, 'assets/images/spritesheets/');

        const images = {
            'diamond': 'diamond.png',
            'heart': 'heart.png',
            'skill-ico': 'skill-ico.png',
            'points-ico': 'points-ico.png',
            'mana-ico': 'mana-ico.png',
            'diamond-ico': 'diamond-ico.png',
            'heart-ico': 'heart-ico.png',
            'heart-ico-gray': 'heart-ico-gray.png',
            'floor': 'floor.png',
            'rock': 'rock.png',
            'boundary-ver': 'boundary-ver.png',
            'boundary-hor': 'boundary-hor.png',
            'starfield': 'starfield.jpg'
        };

        this.loadFiles('image', images, 'assets/images/sprites/');

        const infos = {
            'info-delayed': 'info-delayed.png',
            'info-enemy': 'info-enemy.png',
            'info-info': 'info-info.png',
            'info-rocks': 'info-rocks.png',
            'info-skill2': 'info-skill2.png',
            'info-skill3': 'info-skill3.png',
            'info-skills': 'info-skills.png',
            'info-story': 'info-story.png',
            'info-ui': 'info-ui.png',
            'main-menu': 'main-menu.png',
            'end-lose': 'end-lose.png',
            'end-win': 'end-win.png',
            'empty': 'empty.png'
        };

        this.loadFiles('image', infos, 'assets/images/infos/');

        const sounds = {
            'sfx' : 'sounds.mp3'
        };

        this.loadFiles('audio', sounds, 'assets/sounds/');

        let levels = {};

        for (let i = 1; i <= LEVELS_COUNT ; i++){
            levels['level'+i] = 'level'+i+'.json';
        }

        this.loadFiles('json', levels, 'assets/levels/');

        let txts = {
            'credits' : 'game-credits.txt'
        };

        this.loadFiles('text', txts, 'assets/txts/');
    }

    //Used by Phaser to create real game - prepare it
    create = () => {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        this.sfx = this.game.add.audio('sfx');
        this.sfx.allowMultiple = true;

        const sfxMarkers = {
            'floor': [0, 0.389],
            'hurt': [0.996, 0.321],
            'diamond': [2, 2.427],
            'level': [5, 1.5],
            'soundtrack': [7, 17.301, 0.5],
            'miss': [25, 0.229]
        };

        this.addSoundMarkers(this.sfx, sfxMarkers);

        setTimeout(() => {
            //Fuckin bugs...
            this.sfx.play('soundtrack');
            setInterval(() => {
                //Fuckin bugs...
                this.sfx.play('soundtrack');
            }, 17.301 * 1000);
        }, 1000);

        this.menu.showMainMenu();
    }

    /**
     * This will create markers in markers{}
     * @param Phaser.Sound snd
     * @param object markers This should be assoc-array-like object. Key is key in Phaser (used in play()), value is array - it will hold arguments to extract to addMarker() function.
     */
    private addSoundMarkers(snd:Phaser.Sound, markers:any){
        for ( let key in markers ){
            const args = markers[key];
            (snd.addMarker as any )(key, ...args);
        }
    }

    /**
     * This will load list of files in files{}
     * @param string phaserType This is Phaser's category in this.game.load.category
     * @param object files This should be assoc-array-like object. Key is key in Phaser (for example sprite image name), value may be: string - file name or array - it will hold arguments to extract to loader function.
     * @param string fnPrefix This will add prefix to file names.
     */
    private loadFiles(phaserType:string, files:any, fnPrefix:string = ''){
        const loader = (this.game.load[phaserType]).bind(this.game.load);

        for ( let key in files ){
            const val = files[key];
            if (typeof val == 'string')
                loader(key, fnPrefix + val);
            else {
                const args = val.map((el, idx) => idx==0?fnPrefix+el:el);
                loader(key, ...args);
            }
        }
    }

    /**
     * Start the game at the desired level.
     */
    public startGame(level:number=1){
        this.level = level-1;

        if (level == 1) {
            this.menu.displayInfo('info-story', () => {
                this.menu.displayInfo('info-info', () => {
                    this.menu.displayInfo('info-ui', () => {
                        this.loadNextLevel();
                    });
                });
            });
        } else
            this.loadNextLevel();

        this.genHPPoint();
    }

    /**
     * Gen HP +1 heart.
     */
    private genHPPoint(){
        const waitForNextHP = Math.round(this.hpLeft*4 * 1000);

        setTimeout(() => {
            //No game
            if ((!this.thereIsTheGame) || (!this.map) || (this.game.paused)){
                return this.genHPPoint();
            }

            //Max HP
            if (this.hpLeft == 10) {
                return this.genHPPoint();
            }

            //Gen HP!
            const pos = this.map.mapXYToGameXY(this.map.randomFloor());

            this.heart = this.game.add.sprite(pos.x, pos.y, 'heart');

            this._hpSpritePrepare();
        }, waitForNextHP);
    }

    /**
     * Prepare HP heart sprite.
     */
    private _hpSpritePrepare(){
        this.heart.anchor.setTo(0.5, 0.5);
        this.game.physics.arcade.enable(this.heart);

        this.heart.bringToTop();
    }

    //Used by Phaser to update real game scene.
    update = () =>{
        try {
            if ((!this.thereIsTheGame) || (!this.map)) return;

            this.game.physics.arcade.collide(this.player, this.boundaries);

            this.game.physics.arcade.collide(this.player, this.diamond, () => this.onDiamonCollide());

            this.game.physics.arcade.collide(this.player, this.heart, () => this.onHeartCollide());

            this.enemies.forEach((enemy:Enemy) => {
                enemy.makeMoves(this.player, this.boundaries);
            });

            this.map.updateGameSprites(this.floors, this.rocks, this.boundaries, this.onFloorCLick);

            if (this.map.movementLocked()) {
                //No movement!
            } else {
                const newPos = this.translateMovementKeys();
                if ((newPos.x != 0) || (newPos.y != 0)) {
                    (this.player.body as Phaser.Physics.Arcade.Body).velocity.set(newPos.x, newPos.y);
                } else {
                    //Smooth-"breaking" :)

                    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x > 0)
                        (this.player.body as Phaser.Physics.Arcade.Body).velocity.x -= 50;
                    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x < 0)
                        (this.player.body as Phaser.Physics.Arcade.Body).velocity.x += 50;

                    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y > 0)
                        (this.player.body as Phaser.Physics.Arcade.Body).velocity.y -= 50;
                    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y < 0)
                        (this.player.body as Phaser.Physics.Arcade.Body).velocity.y += 50;
                }

                this.checkSpriteIsOnFloor(this.player);

                this.playPlayerAnimation();

                if (this.bg.z > 0)
                    this.bg.sendToBack();
            }

            this.updateGameInfo();

            this.stuffToBringUp.forEach((sprite:Sprite) => sprite.bringToTop());

            this.debugSpritesBody([
                {
                    items: [this.player],
                    color: 'rgba(0,255,0,0.8)'
                },
                {
                    items: this.boundaries,
                    color: 'rgba(255,0,0,0.8)'
                }
            ]);
        } catch(e){
            console.error(e);
        }
    }

    /**
     * This is special helper that will try to correct position of sprite when it is out of the floor (for example because of collision bug).
     */
    public checkSpriteIsOnFloor(sprite:Sprite){
        const betterPos = new Phaser.Point(sprite.position.x, sprite.position.y);
        betterPos.add(50, 50);

        const pos = this.map.gameXYToMapXY(betterPos);

        if (!this.map.getIsFloor(pos)){
            //Not on floor! Shiet!

            const vel = sprite.body.velocity;
            let change = new Phaser.Point(0,0);

            if ((vel.x==0) && (vel.y)){
                //We don't know what to do, try random...
                change.add(
                    Math.random()>0.5 ? 50 : -50,
                    Math.random()>0.5 ? 50 : -50
                );
            } else {
                change.add(
                    (vel.x>-50) && (vel.x<-50) ? 0 : (vel.x>0 ? -50 : 50),
                    (vel.y>-50) && (vel.y<-50) ? 0 : (vel.y>0 ? -50 : 50)
                );
            }

            sprite.position.add(change.x, change.y);

            return false;
        }

        return true;
    }

    /**
      *  Cleanup, load next level.
     **/
    private loadNextLevel(){
        this.thereIsTheGame = false;

        //Cleanup:
        if (this.map)
            this.map.destroy();
        this.map = null;

        this.floors = [];
        this.rocks = [];
        this.boundaries = [];
        this.enemies = [];

        this.stuffToBringUp = [];

        this.diamonds = 0;

        this.game.world.removeAll(true);

        if (this.level+1 >= LEVELS_COUNT){
            this.menu.displayInfo('end-win', null);
            this.menu.addBtn(new Phaser.Point(360, 435), 'Survey', () => {
                window.location.assign('https://jakubkrol.typeform.com/to/uaVHvV');
            });

            return;
        }

        var loadStep2 = () => {

            this.bg = this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'starfield');
            this.bg.fixedToCamera = true;
            this.bg.sendToBack();

            this.player = this.game.add.sprite(-10, -10, 'player');
            this.player.animations.add('walkDown', [0, 1, 2], 10, true);
            this.player.animations.add('walkRight', [3, 4, 5], 10, true);
            this.player.animations.add('walkUp', [6, 7, 8], 10, true);
            this.player.animations.add('walkLeft', [9, 10, 11], 10, true);
            this.game.physics.arcade.enable(this.player);
            this.player.anchor.setTo(0.5, 0.5);

            // (this.player.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;

            this.game.camera.follow(this.player, Phaser.Camera.FOLLOW_LOCKON, 0.1, 0.1);

            //Load data:
            this.level++;

            this.levelData = this.game.cache.getJSON('level' + this.level);

            this.manaMax = parseInt(this.levelData.manaMax + '');
            this.manaLeft = this.manaMax;

            this.map = new GameMap(this, this.game, this.player, this.enemies, this.levelData.data);

            //Update UI:
            this._genUI();

            this.thereIsTheGame = true;

        };

        this._showInfos(loadStep2);
    }

    /**
     * Placeholder for info in the game.
     */
    private _showInfos(clb : any){
        //level (old level!) = info sprite name
        const lvlInfosSprites = {
            1:'info-skills',
            3:'info-enemy',
            4:'info-rocks',
            5:'info-delayed',
            9:'info-skill2',
            19:'info-skill3'
        };

        const lvlInfoSpriteName = lvlInfosSprites[this.level];

        if (lvlInfoSpriteName)
            this.menu.displayInfo(lvlInfoSpriteName, clb);
        else
            clb();
    }

    /**
     * Gen UI.
     */
    private _genUI(){
        this.diamondsInfo = this._gen1UIEl(30, 30, 'diamond-ico', 10, 30);
        this.manaInfo = this._gen1UIEl(100, 30, 'mana-ico', 80, 30);
        this.skillInfo = this._gen1UIEl(30, 50, 'skill-ico', 10, 50);
        this.pointsInfo = this._gen1UIEl(100, 50, 'points-ico', 80, 50);
        this.gameInfo = this._gen1UIEl(10, 70);

        this._updateHeartIcos();
    }

    /**
     * Helper to create UI elements.
     */
    private _gen1UIEl(x,y:number, icoSpriteKey:string='', icoX:number=0,icoY:number=0, doAddToBringUpAr:boolean=true){
        if (icoSpriteKey) {
            const ico = this.game.add.sprite(icoX, icoY, icoSpriteKey);
            ico.fixedToCamera = true;
            if (doAddToBringUpAr)
                this.stuffToBringUp.push(ico);
        }

        const txt = this.game.add.text(x, y, "", { font: "16px Arial", fill: "#ffffff", align: "center" });
        txt.fixedToCamera = true;
        if (doAddToBringUpAr)
            this.stuffToBringUp.push(txt);

        return txt;
    }

    /**
     * Method used to generate current UI info.
     */
    private updateGameInfo(){
        this.gameInfo.text = `#${this.level}: "${this.levelData.name}"`;
        this.diamondsInfo.text = `${this.diamonds}/${this.levelData.diamondsToWin}`;
        this.manaInfo.text = `${this.manaLeft}/${this.manaMax}`;
        this.skillInfo.text = `[${this.currSkill}]`;
        this.pointsInfo.text = `${this.points}`;
    }

    /**
     * What is says ;)
     */
    private playPlayerAnimation(){
        let
            maxMoveAbs : number = 0,
            maxDir : string = '';

        if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x > maxMoveAbs) {
            maxMoveAbs = (this.player.body as Phaser.Physics.Arcade.Body).velocity.x;
            maxDir = 'Right';
        }
        if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x*-1 > maxMoveAbs) {
            maxMoveAbs = (this.player.body as Phaser.Physics.Arcade.Body).velocity.x*-1;
            maxDir = 'Left';
        }
        if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y > maxMoveAbs) {
            maxMoveAbs = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;
            maxDir = 'Down';
        }
        if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y*-1 > maxMoveAbs) {
            maxMoveAbs = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y*-1;
            maxDir = 'Up';
        }

        if (maxMoveAbs > 0)
            this.player.play('walk' + maxDir);
        else
            this.player.animations.stop();
    }

    /**
     * Handler when player touched diamond.
     */
    private onDiamonCollide(){
        this.game.camera.flash(0x0000cc, 200);
        this.sfx.play('diamond');

        this.diamonds += 1;
        this.points += 100;
        this.manaLeft += 100;
        this.manaLeft = Math.min(this.manaLeft, this.manaMax);

        this.map.genDiamond();

        if (this.diamonds >= parseInt(this.levelData.diamondsToWin+''))
            this._levelWon();
    }

    /**
     * Congratz! You won one level :)
     */
    private _levelWon(){
        //Yeah, easy to cheat, fck it, what fun would it be :)
        store.set('lp' + this.level, true);

        this.sfx.play('level');
        this.loadNextLevel();
    }

    /**
     * Handler when player touched HP heart.
     */
    private onHeartCollide(){
        this.heart.destroy();

        this.game.camera.flash(0xbb00aa, 200);
        this.sfx.play('diamond');

        this.points += 100;
        this.hpLeft += 1;
        this.hpLeft = Math.min(this.hpLeft, 10);

        this._updateHeartIcos();

        this.genHPPoint();
    }

    /**
     * Handler when player touched enemy.
     */
    public onPlayerHurt(){
        this.game.camera.flash(0xff0000, 500);
        this.sfx.play('hurt');

        this.points -= 100;
        this.hpLeft -= 1;
        this.manaLeft -= 100;
        this.manaLeft = Math.max(this.manaLeft, 0);

        this._updateHeartIcos();

        if (this.hpLeft <= 0){
            this.game.world.removeAll(true);
            this.menu.displayInfo('end-lose', () => {
                location.reload(); //lol, simplest way ;)
            });
        }
    }

    /**
     * Update HP hearts in UI.
     */
    private _updateHeartIcos(){
        if (this.heartsIcos)
            this.heartsIcos.forEach((ico : Sprite) => {
                ico.destroy();
            });

        this.heartsIcos = [];

        for ( let i = 0; i < 10; i++ ){
            const heartIco = this.game.add.sprite(10 + (i * 16 + 5), 10, 'heart-ico' + (i < this.hpLeft?'':'-gray') );
            heartIco.fixedToCamera = true;

            this.heartsIcos.push(heartIco);
            this.stuffToBringUp.push(heartIco);
        }
    }

    /**
     * Handler when User click on the floor.
     */
    private onFloorCLick = (element : Sprite) => {
        const manaTaken = this.map.expandFloors(element.position, this.manaLeft, this.currSkill);

        if (manaTaken == 0)
            this.sfx.play('miss');

        this.manaLeft += manaTaken;
    }

    private debugSpritesBody(debugInfo:any[]){
        if (!DEBUG) return;

        debugInfo.forEach((info:any) => {
            info.items.forEach((item:Sprite) => {
                this.game.debug.body(item, info.color);
            });
        });
    }

    /**
     * Translation utility: key to movement. *Also used with skills!*
     */
    private translateMovementKeys(){
        const keys = {
            'LEFT':'x-300',
            'RIGHT':'x300',
            'UP':'y-300',
            'DOWN':'y300',

            'A':'x-300',
            'D':'x300',
            'W':'y-300',
            'S':'y300',

        };

        const skills = {
            'ONE':1,
            'TWO':2,
            'THREE':3
        };

        const skillsLvls = {
            'ONE':0,
            'TWO':10,
            'THREE':20
        };

        let movement = {
            x:0,
            y:0
        };

        for(const key in keys){
            if (this.game.input.keyboard.isDown(Phaser.KeyCode[key])){
                movement[keys[key][0]] += parseInt( keys[key].substr(1) );
            }
        }

        movement.x = Math.max(Math.min(movement.x, 500), -500);
        movement.y = Math.max(Math.min(movement.y, 500), -500);


        for(const key in skills){
            if ((this.level >= skillsLvls[key]) && (this.game.input.keyboard.isDown(Phaser.KeyCode[key]))){
                this.currSkill = skills[key];
            }
        }

        return movement;
    }

}