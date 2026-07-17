/*
 * static/js/background.js
 * 地球Online 动态背景系统
 * 当前实现：ParticleNetwork
 */

class BackgroundEffect {

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.width = 0;
        this.height = 0;
        this.dpr = 1;

        this.running = false;
        this.animationId = null;

        this.mouse = {
            x: null,
            y: null,
            active: false
        };

        this.resize();
    }


    resize() {

        this.dpr = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        this.width = window.innerWidth;
        this.height = window.innerHeight;


        this.canvas.width =
            this.width * this.dpr;

        this.canvas.height =
            this.height * this.dpr;


        this.canvas.style.width =
            this.width + "px";

        this.canvas.style.height =
            this.height + "px";


        this.ctx.setTransform(
            this.dpr,
            0,
            0,
            this.dpr,
            0,
            0
        );
    }


    start() {

        if (this.running) return;

        this.running = true;
        this.animate();
    }


    stop() {

        this.running = false;

        if (this.animationId) {

            cancelAnimationFrame(
                this.animationId
            );

        }

    }


    animate() {

        if (!this.running) return;

        this.update();

        this.draw();


        this.animationId =
            requestAnimationFrame(
                () => this.animate()
            );
    }


    update(){}

    draw(){}

}




class ParticleNetwork extends BackgroundEffect {


    constructor(canvas) {

        super(canvas);


        this.particles = [];

        this.theme = "dark";


        this.colors = {

            dark:[
                "255,215,0",
                "184,134,11",
                "255,255,255"
            ],

            wave:[
                "59,130,246",
                "6,182,212",
                "139,92,246"
            ],

            light:[
                "184,134,11",
                "205,127,50",
                "212,160,23"
            ]

        };


        this.createParticles();


    }



    getParticleCount(){

        let count =
            Math.floor(
                this.width *
                this.height /
                12000
            );


        count =
            Math.min(
                120,
                Math.max(
                    30,
                    count
                )
            );


        if(
            navigator.hardwareConcurrency < 4 ||
            this.width < 768
        ){

            count =
                Math.floor(count / 2);

        }


        return count;

    }



    createParticles(){

        this.particles = [];


        let count =
            this.getParticleCount();


        for(
            let i=0;
            i<count;
            i++
        ){

            this.particles.push({

                x:
                    Math.random()
                    *
                    this.width,

                y:
                    Math.random()
                    *
                    this.height,


                vx:
                    (Math.random()-0.5)
                    *
                    0.5,


                vy:
                    (Math.random()-0.5)
                    *
                    0.5,


                size:
                    Math.random()*2+1,


                alpha:
                    Math.random()*0.5+0.3,


                color:
                    this.randomColor()

            });


        }

    }



    randomColor(){

        let list =
            this.colors[this.theme];


        return list[
            Math.floor(
                Math.random()*list.length
            )
        ];

    }



    setTheme(theme){

        this.theme = theme;


        this.particles.forEach(p=>{

            p.color =
                this.randomColor();

        });

    }




    update(){

        for(
            let p of this.particles
        ){


            p.x += p.vx;
            p.y += p.vy;



            if(
                p.x < 0 ||
                p.x > this.width
            ){

                p.vx *= -1;

            }


            if(
                p.y < 0 ||
                p.y > this.height
            ){

                p.vy *= -1;

            }



            /*
             鼠标交互：
             靠近时轻微吸引
            */

            if(
                this.mouse.active
            ){

                let dx =
                    this.mouse.x-p.x;

                let dy =
                    this.mouse.y-p.y;


                let distance =
                    Math.sqrt(
                        dx*dx+
                        dy*dy
                    );


                if(
                    distance < 160
                ){

                    p.vx +=
                        dx /
                        distance *
                        0.002;


                    p.vy +=
                        dy /
                        distance *
                        0.002;

                }


            }


            p.vx *= 0.995;
            p.vy *= 0.995;


        }

    }




    draw(){


        this.ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );



        let maxDistance = 130;



        /*
        绘制连接线
        */

        for(
            let i=0;
            i<this.particles.length;
            i++
        ){

            let p1 =
                this.particles[i];


            for(
                let j=i+1;
                j<this.particles.length;
                j++
            ){

                let p2 =
                    this.particles[j];


                let dx =
                    p1.x-p2.x;

                let dy =
                    p1.y-p2.y;


                let distance =
                    Math.sqrt(
                        dx*dx+
                        dy*dy
                    );


                if(
                    distance <
                    maxDistance
                ){

                    let opacity =
                        1 -
                        distance /
                        maxDistance;


                    this.ctx.strokeStyle =
                        `rgba(${p1.color},${opacity*0.25})`;


                    this.ctx.lineWidth =
                        1;


                    this.ctx.beginPath();

                    this.ctx.moveTo(
                        p1.x,
                        p1.y
                    );


                    this.ctx.lineTo(
                        p2.x,
                        p2.y
                    );


                    this.ctx.stroke();

                }


            }

        }





        /*
        绘制粒子
        */

        for(
            let p of this.particles
        ){


            this.ctx.beginPath();


            this.ctx.fillStyle =
                `rgba(${p.color},${p.alpha})`;


            this.ctx.arc(
                p.x,
                p.y,
                p.size,
                0,
                Math.PI*2
            );


            this.ctx.fill();


        }



    }


}




class BackgroundManager {


    constructor(){

        this.canvas =
            document.getElementById(
                "background-canvas"
            );


        if(!this.canvas)
            return;



        this.effect =
            new ParticleNetwork(
                this.canvas
            );



        this.currentTheme =
            "dark";



        this.init();

    }



    init(){


        if(
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ){

            return;

        }



        this.effect.start();



        window.addEventListener(
            "resize",
            ()=>{

                this.effect.resize();

                this.effect.createParticles();

            }
        );



        window.addEventListener(
            "mousemove",
            e=>{

                this.effect.mouse.x =
                    e.clientX;

                this.effect.mouse.y =
                    e.clientY;

                this.effect.mouse.active =
                    true;

            }
        );



        document.addEventListener(
            "visibilitychange",
            ()=>{

                if(document.hidden){

                    this.effect.stop();

                }
                else{

                    this.effect.start();

                }

            }
        );


    }




    changeTheme(theme){


        this.currentTheme =
            theme;


        if(this.effect){

            this.effect.setTheme(
                theme
            );

        }


        if(this.canvas){

            this.canvas.style.opacity =
                0;


            requestAnimationFrame(()=>{

                this.canvas.style.opacity =
                    1;

            });

        }

    }



}



window.BackgroundManager =
    BackgroundManager;
