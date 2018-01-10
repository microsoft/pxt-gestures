import { observable } from "mobx";

export class Point {
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}


export class Gesture {
    @observable public samples: GestureExampleData[];
    @observable public labelNumber: number;
    @observable public name: string;
    @observable public description: string;
    @observable public displayGesture: GestureExampleData;

    private static id: number = 0;
    public gestureID: number;

    constructor() {
        this.samples = [];
        this.displayGesture = new GestureExampleData();
        this.gestureID = Gesture.id++;
        this.name = "gesture " + this.gestureID.toString();
        this.description = "description of this gesture will be here. it's a great and wonderful gesture. you won't be dissapointed " + this.gestureID.toString();
    }

    public getCroppedData(): MotionReading[][] {
        let all_data: MotionReading[][] = [];

        for (let i = 0; i < this.samples.length; i++) {
            let sample: MotionReading[] = [];

            for (let j = this.samples[i].cropStartIndex; j <= this.samples[i].cropEndIndex; j++) {
                sample.push(this.samples[i].motion[j].clone());
            }

            all_data.push(sample);
        }

        return all_data;
    }
}


export class GestureExampleData {
    public motion: MotionReading[];
    public videoLink: any;
    public videoData: any;
    public startTime: number;
    public endTime: number;
    public sampleID: number;
    public cropStartIndex: number;
    public cropEndIndex: number;

    private static id: number = 0;

    constructor() {
        this.motion = [];
        this.sampleID = GestureExampleData.id++;
    }

    public clone(): GestureExampleData {
        let cloneSample = new GestureExampleData();

        for (let i = 0; i < this.motion.length; i++) {
            cloneSample.motion.push(this.motion[i]);
        }

        cloneSample.videoLink = this.videoLink;
        cloneSample.videoData = this.videoData;
        cloneSample.startTime = this.startTime;
        cloneSample.endTime = this.endTime;
        cloneSample.cropStartIndex = this.cropStartIndex;
        cloneSample.cropEndIndex = this.cropEndIndex;

        return cloneSample;
    }
}


export class MotionReading {

    constructor(
        public accelX: number,
        public accelY: number,
        public accelZ: number) {
    }

    public clone() {
        return new MotionReading(this.accelX, this.accelY, this.accelZ);
    }

    public get roll() {
        // Based on https://theccontinuum.com/2012/09/24/arduino-imu-pitch-roll-from-accelerometer/
        return Math.atan2(this.accelX, this.accelZ);
    }

    public get pitch() {
        // Based on https://theccontinuum.com/2012/09/24/arduino-imu-pitch-roll-from-accelerometer/
        return Math.atan2(this.accelY, Math.sqrt(this.accelX * this.accelX + this.accelZ * this.accelZ));
    }

}


export class Match {

    constructor(
        public minDist: number,
        public Ts: number,
        public Te: number,
        public classNum: number) {
    }

    public get length(): number {
        return this.Te - this.Ts;
    }

    public get valid(): boolean {
        return this.Ts > 0 || this.Te > 0;
    }
}


export enum DataType {
    Integer = 0,
    Float = 1
}