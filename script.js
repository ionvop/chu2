class Waifu {
    constructor(canvas, path, options = {}) {
        this.canvas = canvas;
        this.path = path;

        this.options = {
            scale: options.scale || 0.3,
            x: options.x || 0.5,
            y: options.y || 0.5,
            print_move: options.print_move || false
        };

        this.override = {
            PARAM_MOUTH_OPEN_Y: null
        };

        this._mouthMultiplier = null;
        this._stopSpeech = new CustomEvent("stop-speech", { detail: { index: this._index } });
    }

    async init() {
        this.app = new PIXI.Application({
            view: this.canvas,
            resizeTo: this.canvas,
            transparent: true
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
                    
                    if (this.options.print_move == true) {
                        console.log({
                            t: t,
                            param: param,
                            value: this.model.internalModel.coreModel.getParamFloat(param)
                        });
                    }
                    
                    requestAnimationFrame(step);
                    return;
                }

                this.override[param] = target;

                if (this.options.print_move == true) {
                    console.log({
                        t: t,
                        param: param,
                        value: this.model.internalModel.coreModel.getParamFloat(param)
                    });
                }

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

    yap(strength = 0.5, speed = 0.5, lipsync = false) {
        let yap = true;

        (async () => {
            let tick = async () => {
                let temp = this.model.internalModel.coreModel.getParamFloat("PARAM_MOUTH_FORM_01");
                
                if (lipsync) {
                    await this.move("PARAM_MOUTH_OPEN_Y", this._mouthMultiplier * (2 - this._mouthMultiplier), 0.1);
                } else {
                    this.move("PARAM_MOUTH_FORM_01", Math.max(-1.5, Math.min(temp, 1.5)) + (Math.random() * 2 - 1), 0.1 / speed);
                    await this.move("PARAM_MOUTH_OPEN_Y", strength, 0.1 / speed);
                    this.move("PARAM_MOUTH_FORM_01", temp, 0.1 / speed);
                    await this.move("PARAM_MOUTH_OPEN_Y", 0, 0.1 / speed);
                    this.override["PARAM_MOUTH_FORM_01"] = null;
                }

                if (yap == false) {
                    this.override["PARAM_MOUTH_FORM_01"] = null;
                    this.override["PARAM_MOUTH_OPEN_Y"] = null;
                    return;
                }

                requestAnimationFrame(tick);
            }

            tick();
        })();

        return () => yap = false;
    }

    async tts(text, motion, index) {
        console.log("Generating audio...");
        let timestamp = Date.now();
        let response = await fetch(`https://ionvop-chu2-rvc-api.hf.space/speak?text=${encodeURIComponent(text)}`);
        response = await response.blob();
        let audioURL = URL.createObjectURL(response);
        let audio = new Audio(audioURL);
        await new Promise(resolve => audio.oncanplaythrough = () => resolve());
        console.log(`Audio generated in ${(Date.now() - timestamp) / 1000}s`);
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let source = audioCtx.createMediaElementSource(audio);
        let analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        let animationId;

        let updateLipsync = () => {
            analyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;

            for (let i = 0; i < bufferLength; i++) {
                let val = (dataArray[i] - 128) / 128;
                sumSquares += val * val;
            }

            let rms = Math.sqrt(sumSquares / bufferLength);
            this._mouthMultiplier = rms;
            animationId = requestAnimationFrame(updateLipsync);
        }

        let stop = this.yap(1, 1, true);
        this.model.motion(motion, index);
        await audio.play();
        audioCtx.resume();
        updateLipsync();
        await new Promise(resolve => setTimeout(resolve, (audio.duration - 1) * 1000));
        cancelAnimationFrame(animationId);
        stop();
    }

    async lipsync(audioURL) {
        let audio = new Audio(audioURL);
        await new Promise(resolve => audio.oncanplaythrough = () => resolve());
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let source = audioCtx.createMediaElementSource(audio);
        let analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        let animationId;

        let updateLipsync = () => {
            analyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;

            for (let i = 0; i < bufferLength; i++) {
                let val = (dataArray[i] - 128) / 128;
                sumSquares += val * val;
            }

            let rms = Math.sqrt(sumSquares / bufferLength);
            this._mouthMultiplier = rms;
            animationId = requestAnimationFrame(updateLipsync);
        }

        let stop = this.yap(1, 1, true);
        await audio.play();
        audioCtx.resume();
        updateLipsync();

        audio.addEventListener("stop-speech", () => {
            audio.pause();
            audio.currentTime = 0;
            audio.dispatchEvent("ended");
        });

        await new Promise(resolve => audio.onended = () => resolve());
        cancelAnimationFrame(animationId);
        stop();
    }
}