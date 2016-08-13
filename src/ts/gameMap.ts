import Enemy from "./enemy";
import Sprite = Phaser.Sprite;
import AmyInSpaceGame from "./game";

export default class GameMap {
    public static FLOOR_SIZE_PX = 100;

    private mapAr:boolean[][];
    private rocksAr:boolean[][];
    private width:number;
    private height:number;
    private floorDelays:number[];
    private floorDelaysMap:any;
    private lockMovement:boolean;

    private genDiamondInterval:number;

    /**
     * Map data is expected to be in format of digits in arrays.
     * Egz:
     * [
     *   '000111000',
     *   '001100000'
     * ]
     */
    constructor(private gameMgr:AmyInSpaceGame, private game:Phaser.Game, player:Sprite, enemies:Enemy[], mapData:string[]){
        this.mapAr = [];
        this.rocksAr = [];
        this.floorDelays = [];
        this.floorDelaysMap = {};

        this.applyMapData(this.createBoundsWalls(mapData), player, enemies);
        console.log('Game data',this.mapAr);

        this.game.world.setBounds(0, 0, this.width * GameMap.FLOOR_SIZE_PX, this.height * GameMap.FLOOR_SIZE_PX);

        this.genDiamondInterval = setInterval(() => this.genDiamond(), 30000);
        this.genDiamond();
    }

    /**
     * Will check is in this map postion there is a floor.
     */
    public getIsFloor(point:Phaser.Point){
        return this.mapAr[point.y][point.x];
    }

    /**
     * Destructor.
     */
    public destroy(){
        clearInterval(this.genDiamondInterval);
    }

    /**
     * This will create boud walls (will add walls at the every edge of map).
     */
    private createBoundsWalls(mapData:string[]):string[]{
        const oldWidth = mapData[0].length;

        let newRocks = '';
        for(let i = 1; i <= oldWidth + 2/*new width*/; i++)
            newRocks += '5';

        mapData.forEach((row : string, idx : number) => {
            mapData[idx] = '5' + row + '5';
        });

        mapData.unshift(newRocks);
        mapData.push(newRocks);

        return mapData;
    }

    /**
     * Generate diamond somethere.
     */
    public genDiamond(){
        if (this.gameMgr.diamond){
            this.gameMgr.diamond.destroy();
        }

        const pos = this.mapXYToGameXY(this.randomFloor());

        this.gameMgr.diamond = this.game.add.sprite(pos.x, pos.y, 'diamond');

        this._diamondSpritePrepare(this.gameMgr.diamond);
    }

    /**
     * Prepare diamond sprite.
     */
    private _diamondSpritePrepare(diamond:Sprite){
        diamond.anchor.setTo(0.5, 0.5);
        this.game.physics.arcade.enable(diamond);

        diamond.bringToTop();
    }

    /**
     * This will return any random floor.
     */
    public randomFloor(){
        while(true){
            const randPoint = new Phaser.Point(Math.round( Math.random() * (this.width-1) ), Math.round( Math.random() * (this.height-1) ));

            if (this.mapAr[randPoint.y][randPoint.x])
                return randPoint;
        }
    }

    /**
     * Set floor to isThereAFloor in map pos.
     */
    public setFloor(pos:Phaser.Point,isThereAFloor:boolean){
        if (
            (pos.x < 0)
            ||
            (pos.y < 0)
            ||
            (pos.x > this.width - 1)
            ||
            (pos.y > this.height - 1)
        )
            throw "Cannot set floor not in range! Required position: " + pos.y+'x'+pos.x+", game map height: "+this.height+', width: '+this.width;

        if (this.rocksAr[pos.y][pos.x])
            throw "Cannot place floor where rock is.";

        this.mapAr[pos.y][pos.x] = isThereAFloor;

        if (isThereAFloor)
            this.pushFloorDelay(pos);
    }

    /**
     * Add floor at map pos.
     */
    public addFloor(pos:Phaser.Point){
        this.setFloor(pos,true);
    }

    /**
     * Remove floor at map pos.
     */
    public removeFloor(pos:Phaser.Point){
        this.setFloor(pos,false);
    }

    /**
     * Set rock to isThereAFloor in map pos.
     */
    public setRock(pos:Phaser.Point,isThereARock:boolean){
        if (
            (pos.x < 0)
            ||
            (pos.y < 0)
            ||
            (pos.x > this.width - 1)
            ||
            (pos.y > this.height - 1)
        )
            throw "Cannot set rock not in range! Required position: " + pos.y+'x'+pos.x+", game map height: "+this.height+', width: '+this.width;

        this.rocksAr[pos.y][pos.x] = isThereARock;
    }

    /**
     * Add rock at map pos.
     */
    public addRock(pos:Phaser.Point){
        this.setRock(pos,true);
    }

    /**
     * Remove rock at map pos.
     */
    public removeRock(pos:Phaser.Point){
        this.setRock(pos,false);
    }

    /**
     * Check is movement in gameplay is locked (paused).
     */
    public movementLocked(){
        return this.lockMovement;
    }

    /**
     * Used in game updates to update all the sprites in the game.
     */
    public updateGameSprites(floors:Sprite[], rocks:Sprite[], boundaries:Sprite[], onFloorClick){
        let changes:boolean =
            this.checkAndBuildElements(floors, this.mapAr, 'floor', (floor:Sprite, x, y:number) => this._floorSpritePrepare(floor, x, y, onFloorClick)) //Floors
            ||
            this.checkAndBuildElements(rocks, this.rocksAr, 'rock', (rock:Sprite) => this._rockSpritePrepare(rock)); //Rocks

        //Boundaries:
        if (changes) {
            this.floorDelays = [];
            this.floorDelaysMap = {};
            this.makeBoundaries(boundaries);
        }
    }

    /**
     * Important helper to check fo existence and update real game with internal data.
     */
    private checkAndBuildElements(spritesAr:Sprite[], elsArray:boolean[][], spriteKey:string, spritePrepareClb:Function):boolean{
        let lastMapAr:boolean[][] = [],
            lastMapSprites:Sprite[][] = [],
            spritesIdxs:any = {},
            changes = false;

        lastMapAr = this.fillArr(this.width, this.height);
        lastMapSprites = this.fillArr(this.width, this.height);

        spritesAr.forEach((sprite:Sprite, idx:number) => {
            const pos = this.gameXYToMapXY(sprite.position);
            lastMapAr[pos.y][pos.x] = true;
            lastMapSprites[pos.y][pos.x] = sprite;
            spritesIdxs[pos.y + 'x' + pos.x] = idx;
        });

        elsArray.forEach((mapRow:boolean[], y:number) => {
            mapRow.forEach((mapCol:boolean, x:number) => {
                if (mapCol != lastMapAr[y][x]) {
                    changes = true;
                    if (mapCol) {
                        //Add Sprite
                        const pos = this.mapXYToGameXY(new Phaser.Point(x, y));
                        const sprite = this.game.add.sprite(pos.x, pos.y, spriteKey);

                        spritePrepareClb(sprite, x, y);

                        spritesAr.push(sprite);
                    } else {
                        //Remove Sprite
                        lastMapSprites[y][x].destroy();
                        spritesAr.splice(spritesIdxs[y + 'x' + x], 1);
                    }
                }
            });
        });

        return changes;
    }

    /**
     * Use expand skill skill!
     */
    public expandFloors(gamePos:Phaser.Point, manaLeft:number, type:number){
        const mapPos = this.gameXYToMapXY(gamePos);

        const freeSpace = {
            'RIGHT' : !this._hasFloorNeighbor(mapPos, new Phaser.Point(1, 0), true),
            'LEFT' : !this._hasFloorNeighbor(mapPos, new Phaser.Point(-1, 0), true),
            'BOTTOM' : !this._hasFloorNeighbor(mapPos, new Phaser.Point(0, 1), true),
            'TOP' : !this._hasFloorNeighbor(mapPos, new Phaser.Point(0, -1), true)
        };

        const selectRandFreeDir = () => {
            let foundDir = '';
            while(!foundDir){
                let i = 0,
                    rand = Math.round(Math.random() * 4 /*0-3*/);

                for(const dir in freeSpace){
                    if ((rand == i) && freeSpace[dir]){
                        foundDir = dir;
                        break;
                    }
                    i++;
                }
            }

            return foundDir;
        };

        const freeDirToPoint = (dir:string) => {
            switch(dir){
                case 'RIGHT':
                    return new Phaser.Point(mapPos.x + 1, mapPos.y + 0);
                case 'LEFT':
                    return new Phaser.Point(mapPos.x - 1, mapPos.y + 0);
                case 'BOTTOM':
                    return new Phaser.Point(mapPos.x + 0, mapPos.y + 1);
                case 'TOP':
                    return new Phaser.Point(mapPos.x + 0, mapPos.y - 1);
            }
        }

        let anythingFree = false;
        for(const dir in freeSpace){
            if (freeSpace[dir]){
                anythingFree=true;
                break;
            }
        }

        if (!anythingFree) return 0; //Nothing to do here :)

        const startPoint = selectRandFreeDir();

        switch(type){
            case 1: //Only one
                if (manaLeft<10) return 0;

                try {
                    this.addFloor(freeDirToPoint(startPoint));
                } catch(e){
                    //ignore.
                }
                this.game.camera.shake(0.005, 150);
                return -10;
            case 2: /* long one */ {
                if (manaLeft<35) return 0;

                let xInc = 0,
                    yInc = 0;
                switch (startPoint) {
                    case 'RIGHT':
                        xInc = 1;
                        yInc = 0;
                        break;
                    case 'LEFT':
                        xInc = -1;
                        yInc = 0;
                        break;
                    case 'BOTTOM':
                        xInc = 0;
                        yInc = 1;
                        break;
                    case 'TOP':
                        xInc = 0;
                        yInc = -1;
                        break;
                }
                const expandTo = Math.round(Math.random() * 3 + 2 /*2 - 5*/);

                let xIncNow = 0,
                    yIncNow = 0;

                try {
                    for (let i = 1; i <= expandTo; i++) {
                        xIncNow += xInc;
                        yIncNow += yInc;

                        this.addFloor(new Phaser.Point(mapPos.x + xIncNow, mapPos.y + yIncNow));
                    }
                } catch(e){
                    //ignore.
                }

                this.game.camera.shake(0.025, 100*expandTo);

                return -35;
            }

            case 3: //explode
                if (manaLeft<80) return 0;

                const expandTo = Math.round( Math.random() * 2 + 1 /*1 - 3*/ );

                for (let i = 1; i <= expandTo; i++) {
                    for (let y = -1; y <= 1; y++){
                        for (let x = -1; x <= 1; x++){
                            const point = new Phaser.Point(mapPos.x + x*i, mapPos.y + y*i);

                            try {
                                this.addFloor(point);
                            } catch(e){
                                //ignore.
                            }
                        }
                    }
                }

                this.game.camera.shake(0.05, 200*expandTo);

                return -80;
        }
    }

    /**
     * Create boundaries into real game.
     */
    private makeBoundaries(boundaries:Sprite[]){
        this.lockMovement=true;

        boundaries.forEach((boundary : Sprite) => {
            boundary.destroy();
        });

        boundaries.splice(0); //reset!

        this.mapAr.forEach((mapRow:boolean[], y:number) => {
            mapRow.forEach((mapCol:boolean, x:number) => {
                if (!mapCol) return; //continue;

                if (!this._hasFloorNeighbor(new Phaser.Point(x, y), new Phaser.Point(1, 0))){
                    //RIGHT
                    boundaries.push(this._insertBoundary(this.mapXYToGameXY(new Phaser.Point(x, y)), 'RIGHT'));
                }

                if (!this._hasFloorNeighbor(new Phaser.Point(x, y), new Phaser.Point(-1, 0))){
                    //LEFT
                    boundaries.push(this._insertBoundary(this.mapXYToGameXY(new Phaser.Point(x, y)), 'LEFT'));
                }

                if (!this._hasFloorNeighbor(new Phaser.Point(x, y), new Phaser.Point(0, 1))){
                    //BOTTOM
                    boundaries.push(this._insertBoundary(this.mapXYToGameXY(new Phaser.Point(x, y)), 'BOTTOM'));
                }

                if (!this._hasFloorNeighbor(new Phaser.Point(x, y), new Phaser.Point(0, -1))){
                    //TOP
                    boundaries.push(this._insertBoundary(this.mapXYToGameXY(new Phaser.Point(x, y)), 'TOP'));
                }
            });
        });

        setTimeout(() => {
            this.lockMovement=false;
        }, 10 /*Sorry, I need it...*/);
    }

    /**
     * Insert one boundary Sprite.
     */
    private _insertBoundary(pos:Phaser.Point, side:string){
        let reposition : Phaser.Point,
            boundaryFile : string;

        switch(side){
            case 'RIGHT':
                reposition = new Phaser.Point(45, 0);
                boundaryFile = 'boundary-ver';
                break;
            case 'LEFT':
                reposition = new Phaser.Point(-45, 0);
                boundaryFile = 'boundary-ver';
                break;
            case 'BOTTOM':
                reposition = new Phaser.Point(0, 45);
                boundaryFile = 'boundary-hor';
                break;
            case 'TOP':
                reposition = new Phaser.Point(0, -45);
                boundaryFile = 'boundary-hor';
                break;
        }

        reposition.add(pos.x, pos.y);

        const boundary = this.game.add.sprite(reposition.x, reposition.y, boundaryFile);
        // boundary.world = new Phaser.Point(reposition.x, reposition.y);
        boundary.anchor.setTo(0.5, 0.5);
        this.game.physics.arcade.enable(boundary);
        (boundary.body as Phaser.Physics.Arcade.Body).immovable = true;

        return boundary;
    }

    /**
     * Important helper. Will check for existence of neighbors - will look for floors, may also look for rocks and game bounds when required.
     */
    public _hasFloorNeighbor(pos, direction:Phaser.Point, includeRocks:boolean=false, resultWhenOutOfGame:boolean=false){
        const newPoint = new Phaser.Point(pos.x, pos.y);
        newPoint.add(direction.x, direction.y);

        if (
            (newPoint.x < 0)
            ||
            (newPoint.y < 0)
            ||
            (newPoint.x > this.width - 1)
            ||
            (newPoint.y > this.height - 1)
        ) {
            return resultWhenOutOfGame; //Out of game field, we want boundary
        }

        return (this.mapAr[newPoint.y][newPoint.x]) || (includeRocks && this.rocksAr[newPoint.y][newPoint.x]);
    }

    /**
     * Prepare rock sprite.
     */
    private _rockSpritePrepare(rock:Sprite){
        rock.anchor.setTo(0.5, 0.5);

        rock.sendToBack();
    }

    /**
     * Prepare floor sprite.
     */
    private _floorSpritePrepare(floor:Sprite, x,y:number, onFloorClick:Function){
        floor.scale.set(0,0);
        floor.anchor.setTo(0.5, 0.5);

        switch(Math.round(Math.random()*4)){
            case 0:
                floor.angle=0;
                break;
            case 1:
                floor.angle=90;
                break;
            case 2:
                floor.angle=-90;
                break;
            case 3:
                floor.angle=180;
                break;
        }

        floor.sendToBack();

        floor.inputEnabled = true;
        floor.events.onInputDown.add(onFloorClick);

        setTimeout(() => {
            this.gameMgr.sfx.play('floor');
        }, this.floorDelays[ this.floorDelaysMap[y+'x'+x] ]);
        this.game.add.tween(floor.scale).to({ x: 1, y: 1 }, 1000, Phaser.Easing.Bounce.Out, true, this.floorDelays[ this.floorDelaysMap[y+'x'+x] ]);
    }

    /**
     * Internal method to add delay of floor display.
     */
    private pushFloorDelay(pos:Phaser.Point){
        const newDelay = (this.floorDelays.length == 0) ? 0 : this.floorDelays[ this.floorDelays.length - 1 ] + 100;

        this.floorDelays.push(newDelay);
        this.floorDelaysMap[pos.y+'x'+pos.x] = this.floorDelays.length-1/*save index*/;
    }

    /**
     * Main method to turn map data from editor into internal map arrays.
     */
    private applyMapData(mapData:string[], player:Sprite, enemies:Enemy[]){
        this.height = mapData.length;
        this.width = mapData[0].length;

        this.mapAr = this.fillArr(this.width, this.height);
        this.rocksAr = this.fillArr(this.width, this.height);

        mapData.forEach((dataRow:string, y:number) => {
            for (let x = 0, len = dataRow.length; x < len; x++) {
                const digit = parseInt(dataRow[x]);

                switch (digit){
                    case 2: //Player pod
                        player.position = this.mapXYToGameXY(new Phaser.Point(x, y));
                    //break; No break! After this that should be case 1 - we also want floor here!
                    case 1: //Floor
                        this.addFloor(new Phaser.Point(x, y));
                        break;
                    case 3: //Floor later
                        setTimeout(() => {
                            this.addFloor(new Phaser.Point(x, y));
                        }, 3000);
                        break;
                    case 4: //Floor more later
                        setTimeout(() => {
                            this.addFloor(new Phaser.Point(x, y));
                        }, 10000);
                        break;
                    case 5: //Rock
                        this.addRock(new Phaser.Point(x, y));
                        break;
                    case 6: //Enemy
                        this.addFloor(new Phaser.Point(x, y));
                        enemies.push(new Enemy(this.gameMgr, this.game, this.mapXYToGameXY(new Phaser.Point(x, y))));
                        break;
                }
            }
        });
    }

    /**
     * Helper to make any array [[false, false, false...], ...]
     */
    private fillArr(width,height:number){
        return Array(height).fill(Array(width).fill(false));
    }

    /**
     * Convert map pos into real game pos.
     */
    public mapXYToGameXY(pos:Phaser.Point){
        return new Phaser.Point(
            (pos.x) * GameMap.FLOOR_SIZE_PX + Math.round(GameMap.FLOOR_SIZE_PX / 2),
            (pos.y) * GameMap.FLOOR_SIZE_PX + Math.round(GameMap.FLOOR_SIZE_PX / 2)
        );
    }

    /**
     * Convert real game pos into map pos.
     */
    public gameXYToMapXY(pos:Phaser.Point){
        return new Phaser.Point(
            Math.floor((pos.x - Math.round(GameMap.FLOOR_SIZE_PX / 2)) / GameMap.FLOOR_SIZE_PX ),
            Math.floor((pos.y  - Math.round(GameMap.FLOOR_SIZE_PX / 2)) / GameMap.FLOOR_SIZE_PX)
        );
    }
}