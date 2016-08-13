import GameMap from './gameMap';
import Sprite = Phaser.Sprite;
import AmyInSpaceGame from "./game";
import {DEBUG} from "./config";

export default class Enemy {
    private sprite : Sprite;
    private followMode : boolean = false;
    private movingInterval : number = 0;
    private wallTouchCount : number = 0;
    private noHurt : boolean = false;
    private randomMoveCurrDir : Phaser.Point = null;

    // Original:
    // private AIConfig = {
    //     wallTouchToAbandonFollowMode    : 250,
    //     randomMovingInterval            : 1000,
    //     randomMovingTimeout             : 10000,
    //     speedIdle                       : 125,
    //     speedFollowPlayer               : 160
    // };

    private AIConfig : any;

    private logMe(s, obj:any=null){
        if (!DEBUG) return;

        console.log(`AI ${this.AIConfig.name}: ${s}`, obj);
    }

    constructor(private gameMgr:AmyInSpaceGame, private game:Phaser.Game, posOnMap:Phaser.Point){
        const zombieNo = Math.round(Math.random()*5+1 /*1-6*/);

        this.sprite = this.game.add.sprite(posOnMap.x, posOnMap.y, 'zombie' + zombieNo);

        switch (zombieNo){
            case 1:
                this.AIConfig = {
                    name : 'Dumb',
                    wallTouchToAbandonFollowMode    : 250,
                    randomMovingInterval            : 1000,
                    randomMovingTimeout             : 6000,
                    speedIdle                       : 125,
                    speedFollowPlayer               : 160
                };
                break;
            case 2:
                this.AIConfig = {
                    name : 'Balanced',
                    wallTouchToAbandonFollowMode    : 150,
                    randomMovingInterval            : 1000,
                    randomMovingTimeout             : 4000,
                    speedIdle                       : 125,
                    speedFollowPlayer               : 160
                };
                break;
            case 3:
                this.AIConfig = {
                    name : 'Very fast but very dumb',
                    wallTouchToAbandonFollowMode    : 300,
                    randomMovingInterval            : 500,
                    randomMovingTimeout             : 8000,
                    speedIdle                       : 160,
                    speedFollowPlayer               : 250
                };
                break;
            case 4:
                this.AIConfig = {
                    name : 'Intelligent but slow',
                    wallTouchToAbandonFollowMode    : 75,
                    randomMovingInterval            : 300,
                    randomMovingTimeout             : 2000,
                    speedIdle                       : 100,
                    speedFollowPlayer               : 130
                };
                break;
            case 5:
                this.AIConfig = {
                    name : 'Fast and dump, freak',
                    wallTouchToAbandonFollowMode    : 225,
                    randomMovingInterval            : 500,
                    randomMovingTimeout             : 5000,
                    speedIdle                       : 150,
                    speedFollowPlayer               : 175
                };
                break;
            case 6:
                this.AIConfig = {
                    name : 'Moving all the time but slowly',
                    wallTouchToAbandonFollowMode    : 25,
                    randomMovingInterval            : 750,
                    randomMovingTimeout             : 3000,
                    speedIdle                       : 115,
                    speedFollowPlayer               : 115
                };
                break;
        }

        this.logMe('created');

        this.sprite.animations.add('walkDown', [0,1,2], 10, true);
        this.sprite.animations.add('walkRight', [3,4,5], 10, true);
        this.sprite.animations.add('walkUp', [6,7,8], 10, true);
        this.sprite.animations.add('walkLeft', [9,10,11], 10, true);

        this.game.physics.arcade.enable(this.sprite);
        this.sprite.anchor.setTo(0.5, 0.5);
        this.followMode = Math.random()>0.5; //Random 1/2 start mode

        setInterval(() => {
            this.wallTouchCount = 0;
        }, 10000);
    }

    private onBoundaryCollide(obj1, obj2 : Sprite){
        if (!this.followMode) return;

        this.wallTouchCount++;

        if (this.wallTouchCount >= this.AIConfig.wallTouchToAbandonFollowMode){
            this.followMode = false;
        }
    }

    private playAnim(){
        let
            maxMoveAbs : number = 0,
            maxDir : string = '';

        if ((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x > maxMoveAbs) {
            maxMoveAbs = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x;
            maxDir = 'Right';
        }
        if ((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x*-1 > maxMoveAbs) {
            maxMoveAbs = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x*-1;
            maxDir = 'Left';
        }
        if ((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y > maxMoveAbs) {
            maxMoveAbs = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y;
            maxDir = 'Down';
        }
        if ((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y*-1 > maxMoveAbs) {
            maxMoveAbs = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y*-1;
            maxDir = 'Up';
        }

        this.sprite.play('walk' + maxDir);
    }

    private onPlayerCollide(obj1, obj2 : Sprite){
        if (this.noHurt) return;

        this.noHurt = true;
        this.sprite.scale.set(0.5,0.5);
        this.sprite.alpha = 0.75;

        setTimeout(() => {
            this.noHurt = false;
            this.sprite.scale.set(1,1);
            this.sprite.alpha = 1;
        }, 3000);

        this.gameMgr.onPlayerHurt();

        this.followMode = false; //Try to escape
        this.game.physics.arcade.moveToXY(this.sprite, Math.round(Math.random() * this.game.world.width), Math.round(Math.random() * this.game.world.height), 250);
        this.playAnim();
    }

    /**
     * Call it in update to move!
     */
    public makeMoves(player:Sprite, boundaries:Sprite[]){
        if (!this.gameMgr.checkSpriteIsOnFloor(this.sprite)){
            return this.playAnim();
        }

        this.game.physics.arcade.collide(this.sprite, player, (o1, o2) => this.onPlayerCollide(o1, o2));

        this.game.physics.arcade.collide(this.sprite, boundaries, (o1, o2) => this.onBoundaryCollide(o1, o2));

        if (this.followMode) {
            this.game.physics.arcade.moveToObject(this.sprite, player, this.AIConfig.speedFollowPlayer);
            this.playAnim();
        } else
            this.randomMoves();
    }

    private randomMoves(){
        if (this.movingInterval > 0) return;

        this.movingInterval = setInterval(() => this._doRandomMove(), this.AIConfig.randomMovingInterval);

        setTimeout(() => {
            clearInterval(this.movingInterval);
            this.movingInterval = 0;
            this.followMode = true;
        }, this.AIConfig.randomMovingTimeout);
    }

    private _doRandomMove(){
        const betterPos = new Phaser.Point(this.sprite.position.x, this.sprite.position.y);
        betterPos.add(50, 50);

        const pos = this.gameMgr.map.gameXYToMapXY(betterPos);

        if ((!this.randomMoveCurrDir)
            || (!this.gameMgr.map._hasFloorNeighbor(pos, this.randomMoveCurrDir))
        ) {
            const possibleMoves = ([new Phaser.Point(1, 0), new Phaser.Point(-1, 0), new Phaser.Point(0, 1), new Phaser.Point(0, -1)]).filter((dirPoint:Phaser.Point) => {
                return this.gameMgr.map._hasFloorNeighbor(pos, dirPoint);
            });

            if (possibleMoves.length == 0){
                this.game.physics.arcade.moveToXY(this.sprite, Math.round(Math.random() * this.game.world.width), Math.round(Math.random() * this.game.world.height), this.AIConfig.speedIdle);
            } else {
                //Select some dir...
                this.randomMoveCurrDir = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

                this.logMe('initing randomMoveCurrDir', this.randomMoveCurrDir);
            }
        } else {
            const newPos = new Phaser.Point(this.sprite.position.x, this.sprite.position.y);
            newPos.add(this.randomMoveCurrDir.x * GameMap.FLOOR_SIZE_PX, this.randomMoveCurrDir.y * GameMap.FLOOR_SIZE_PX);
            this.game.physics.arcade.moveToXY(this.sprite, newPos.x, newPos.y, this.AIConfig.speedIdle);
        }

        this.playAnim();
    }
}