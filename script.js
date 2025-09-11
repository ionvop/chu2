class Waifu {
    constructor(canvas, path, options = {}) {
        this.canvas = canvas;
        this.path = path;

        this.options = {
            scale: options.scale || 0.3,
            x: options.x || 0.5,
            y: options.y || 0.5
        };

        this.override = {
            PARAM_MOUTH_OPEN_Y: null
        };
    }

    async init() {
        this.app = new PIXI.Application({
            view: this.canvas,
            resizeTo: this.canvas
        });

        this.model = await PIXI.live2d.Live2DModel.from(this.path, {
            autoInteract: false
        });

        this.app.stage.addChild(this.model);
        this.model.scale.set(this.options.scale);
        this.model.position.set(this.canvas.width * this.options.x, this.canvas.height * this.options.y);
        this.model.anchor.set(0.5, 0.5);

        this.canvas.onpointermove = (event) => {
            if (this.focus == false || this._isFocus == false) return;
            this.model.focus(event.clientX, event.clientY);
        }

        this.canvas.onmouseleave = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.stare();
        }

        this.canvas.onpointerdown = event => this.model.tap(event.clientX, event.clientY);
        
        this.canvas.onpointerup = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.stare();
        }

        this.model.on("hit", hitAreaNames => {
            console.log(hitAreaNames);

            if (hitAreaNames.includes('body')) {
                this.model.motion("angry");
            }
        });

        this.model.internalModel.on("afterMotionUpdate", () => {
            for (let param in this.override) {
                if (this.override[param] != null) {
                    this.model.internalModel.coreModel.setParamFloat(param, this.override[param]);
                }
            }
        })
    }

    look(x, y) {
        this.model.focus(window.innerWidth * x, window.innerHeight * y);
    }

    stare() {
        this.model.internalModel.focusController.focus(0, 0);
    }

    move(param, target, duration = 1, ease = "inout") {
        return new Promise(resolve => {
            const easingFunctions = {
                linear: t => t,
                in: t => t * t,
                out: t => t * (2 - t),
                inout: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            };

            let from = this.model.internalModel.coreModel.getParamFloat(param);
            const easingFunction = easingFunctions[ease] || easingFunctions.linear;
            let start = Date.now();
            
            let step = () => {
                let t = (Date.now() - start) / (duration * 1000);

                if (t < 1) {
                    this.override[param] = from + (target - from) * easingFunction(t);
                    
                    console.log({
                        t: t,
                        param: param,
                        value: this.model.internalModel.coreModel.getParamFloat(param)
                    });
                    
                    requestAnimationFrame(step);
                    return;
                }

                this.override[param] = target;

                console.log({
                    t: t,
                    param: param,
                    value: this.model.internalModel.coreModel.getParamFloat(param)
                });

                resolve();
            }

            step();
        });
    }

    async animate(type, options = {}) {
        switch (type) {
            case  "yes": {
                if (options.repeat == null) options.repeat = 2;
                this.move("PARAM_EYE_L_OPEN", 0, 0.1);
                this.move("PARAM_EYE_R_OPEN", 0, 0.1);
                this.move("PARAM_EYE_L_SMILE", 1, 0.1);
                this.move("PARAM_EYE_R_SMILE", 1, 0.1);
                
                for (let i = 0; i < options.repeat; i++) {
                    await this.move("PARAM_ANGLE_Y", 30, 0.2);
                    await this.move("PARAM_ANGLE_Y", -30, 0.2);
                }

                this.move("PARAM_EYE_L_OPEN", 1, 0.1);
                this.move("PARAM_EYE_R_OPEN", 1, 0.1);
                this.move("PARAM_EYE_L_SMILE", 0, 0.1);
                this.move("PARAM_EYE_R_SMILE", 0, 0.1);
                await this.move("PARAM_ANGLE_Y", 0, 0.2);
                this.override["PARAM_EYE_L_OPEN"] = null;
                this.override["PARAM_EYE_R_OPEN"] = null;
                this.override["PARAM_EYE_L_SMILE"] = null;
                this.override["PARAM_EYE_R_SMILE"] = null;
                this.override["PARAM_ANGLE_Y"] = null;
                this.stare();
            } break;
            case "no": {
                if (options.repeat == null) options.repeat = 2;
                this.move("PARAM_EYE_L_OPEN", 0, 0.1);
                this.move("PARAM_EYE_R_OPEN", 0, 0.1);
                this.move("PARAM_MOUTH_FORM_01", -2.5, 0.1);
                
                for (let i = 0; i < options.repeat; i++) {
                    this.move("PARAM_ANGLE_X", 30, 0.3);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    this.move("PARAM_ANGLE_X", -30, 0.3);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                this.move("PARAM_EYE_L_OPEN", 1, 0.1);
                this.move("PARAM_EYE_R_OPEN", 1, 0.1);
                this.move("PARAM_MOUTH_FORM_01", 0, 0.1);
                await this.move("PARAM_ANGLE_X", 0, 0.2);
                this.override["PARAM_EYE_L_OPEN"] = null;
                this.override["PARAM_EYE_R_OPEN"] = null;
                this.override["PARAM_MOUTH_FORM_01"] = null;
                this.override["PARAM_ANGLE_X"] = null;
                this.stare();
            } break;
        }
    }

    yap(strength = 0.5, speed = 0.5) {
        let yap = true;

        (async () => {
            let mouthForm;
            
            while (yap) {
                mouthForm = this.move("PARAM_MOUTH_FORM_01", Math.random() * 5 - 2.5, 0.3 / speed);
                await this.move("PARAM_MOUTH_OPEN_Y", strength, 0.1 / speed);
                await this.move("PARAM_MOUTH_OPEN_Y", 0, 0.1 / speed);
            }

            await mouthForm;
            this.override["PARAM_MOUTH_FORM_01"] = null;
            this.override["PARAM_MOUTH_OPEN_Y"] = null;
        })();

        return () => yap = false;
    }
}