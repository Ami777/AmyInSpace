import Sprite = Phaser.Sprite;
import AmyInSpaceGame from "./game";
import {LEVELS_COUNT} from "./config";

export default class MenusInfo {
    private infoClb : any;
    private infoSprite : Sprite = null;

    constructor(private gameMgr:AmyInSpaceGame, private game:Phaser.Game){
    }

    /**
     * Main menu.
     */
    public showMainMenu(){
        this.displayInfo('main-menu', null);

        this._buildLevelBtns();
        this.addBtn(new Phaser.Point(590, 430), 'Credits', () => this._creditsInfo());
    }

    private _buildLevelBtns(){
        const startPos = new Phaser.Point(120, 250),
            width = 540,
            height = 180;

        const cols = 10,
            rows = Math.ceil(LEVELS_COUNT / cols),
            rowHeight = Math.round(height / rows),
            colWidth = Math.round(width / cols),
            rowSpace = Math.round((rowHeight - 33) /* Small btn height, trust me, I know what I'm sayin' */ / 2),
            colSpace = Math.round((colWidth - 47) /* Small btn width */ / 2);

        let row = 0,
            col = 0;

        for ( let lvl = 1; lvl <= LEVELS_COUNT; lvl++ ){
            col++;
            if (col == 11) {
                row++;
                col=1; /*col = 0; col++*/
            }

            const pos = new Phaser.Point(
                startPos.x /* Start pos*/
                + colSpace /*Space after last btn*/
                + colSpace /*Space before this btn*/
                + 47*(col-1) /*Width of previous btns*/
                + colSpace*2*(col-1) /*Space of previous btns*/,

                startPos.y /*Start pos*/
                + rowSpace /*Space after last row*/
                + rowSpace /*Space before this row*/
                + 33*(row) /*Height of previous row*/
                + rowSpace*2*(row) /*Space of previous rows*/);

            this.addBtn(pos, lvl+'', () => this._onLevelBtnClick(lvl), true,
                lvl == 1
                ||
                store.get('lp' + (lvl-1), false)
            );
        }
    }

    private _creditsInfo(){
        this.displayInfo('empty', () => this.showMainMenu());

        const txtObj = this.game.add.text(0, 0, this.game.cache.getText('credits'), {
            boundsAlignV: 'middle',
            wordWrap:true,
            wordWrapWidth:525,
            fontSize:'14px'
        });

        txtObj.setTextBounds(120, 80, 525, 380);
    }

    private _onLevelBtnClick(lvl:number){
        this.gameMgr.startGame(lvl);
    }

    /**
     * Helper to add in-game button.
     */
    public addBtn(pos:Phaser.Point, txt:string, clb:any=null, small:boolean=false, enabled:boolean=true){
        const btnObj = enabled ?
            this.game.add.button(pos.x, pos.y, small?'btn-small':'btn', clb, this, 1, 0, 2)
            :
            this.game.add.button(pos.x, pos.y, small?'btn-small':'btn', null, this, 3, 3, 3, 3);

        const txtObj = this.game.add.text(pos.x, pos.y, txt, {
            boundsAlignH: 'center',
            boundsAlignV: 'middle',
            fontSize:'20px'
        });

        txtObj.setTextBounds(0,0, small?47:80, small?40:60);
    }

    /**
     * Display some kind of info.
     */
    public displayInfo(infoSpriteName : string, clb : any){
        this.infoSprite = this.game.add.sprite(0, 0, infoSpriteName);

        const x = this.game.width / 2 - this.infoSprite.width / 2,
            y = this.game.height / 2 - this.infoSprite.height / 2;

        this.infoSprite.position.set(x, y);

        this.infoSprite.inputEnabled = true;

        setTimeout(() => {
            this.infoSprite.events.onInputDown.add(() => this.onInfoClick());
        }, 700); //Don't activate it at the beginning so that someone will be able to click it by accident

        this.infoSprite.bringToTop();

        //Restart size
        this.game.world.width=800;
        this.game.world.height=600;
        this.game.camera.follow(this.infoSprite);

        this.infoClb = clb;
    }

    private onInfoClick(){
        if (!this.infoClb) return; //null on infoClb means we don't want to exit

        this.game.lockRender = false;
        this.infoSprite.destroy();
        this.infoSprite = null;
        this.infoClb();
    }
}