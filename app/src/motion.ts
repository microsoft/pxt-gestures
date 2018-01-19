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


function intSqrt(n: number) {
    if (n < 0) return -1;

    let shift = 2;
    let nShifted = n >> shift;

    while (nShifted != 0 && nShifted != n) {
        shift += 2;
        nShifted = n >> shift;
    }

    shift -= 2;

    let result = 0;

    while (shift >= 0) {
        result = result << 1;
        let candidateResult = result + 1;

        if (candidateResult * candidateResult <= n >> shift)
            result = candidateResult;

        shift -= 2;
    }

    return result;
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

    public round() {
        return new MotionReading(Math.round(this.accelX), Math.round(this.accelY), Math.round(this.accelZ))
    }

    public get roll() {
        // Based on https://theccontinuum.com/2012/09/24/arduino-imu-pitch-roll-from-accelerometer/
        return Math.atan2(this.accelX, this.accelZ);
    }

    public get pitch() {
        // Based on https://theccontinuum.com/2012/09/24/arduino-imu-pitch-roll-from-accelerometer/
        return Math.atan2(this.accelY, Math.sqrt(this.accelX * this.accelX + this.accelZ * this.accelZ));
    }

    public static random() {
        return new MotionReading(Math.random() * 2048 - 1024, Math.random() * 2048 - 1024, Math.random() * 2048 - 1024);
    }

    public static euclideanDistance(a: MotionReading, b: MotionReading): number {
        // L2 Norm:
        return Math.sqrt(
            (a.accelX - b.accelX) ** 2 +
            (a.accelY - b.accelY) ** 2 +
            (a.accelZ - b.accelZ) ** 2);
    }


    public static manhattanDistance(a: MotionReading, b: MotionReading): number {
        // L1 Distance:
        return Math.abs(a.accelX - b.accelX) +
            Math.abs(a.accelY - b.accelY) +
            Math.abs(a.accelZ - b.accelZ);
    }


    public static euclideanDistanceFast(a: MotionReading, b: MotionReading): number {
        // L2 Norm:
        return intSqrt(
            (a.accelX - b.accelX) * (a.accelX - b.accelX) +
            (a.accelY - b.accelY) * (a.accelY - b.accelY) +
            (a.accelZ - b.accelZ) * (a.accelZ - b.accelZ));
    }




    public static mean(inp: MotionReading[]): MotionReading {
        let mean = new MotionReading(0, 0, 0);

        for (let i = 0; i < inp.length; i++) {
            mean.accelX += inp[i].accelX;
            mean.accelY += inp[i].accelY;
            mean.accelZ += inp[i].accelZ;
        }

        mean.accelX /= inp.length;
        mean.accelY /= inp.length;
        mean.accelZ /= inp.length;

        return mean;
    }


    public static variance(protoArray: MotionReading[][]): number {
        let sum = new MotionReading(0, 0, 0);
        let sumSquares = new MotionReading(0, 0, 0);
        let size = 0;

        for (let i = 0; i < protoArray.length; i++) {
            size += protoArray[i].length;

            for (let j = 0; j < protoArray[i].length; j++) {
                sum = new MotionReading(
                    sum.accelX + protoArray[i][j].accelX,
                    sum.accelY + protoArray[i][j].accelY,
                    sum.accelZ + protoArray[i][j].accelZ);
                sumSquares = new MotionReading(
                    sumSquares.accelX + protoArray[i][j].accelX ** 2,
                    sumSquares.accelY + protoArray[i][j].accelY ** 2,
                    sumSquares.accelZ + protoArray[i][j].accelZ ** 2);
            }
        }

        let variance = new MotionReading(
            ((sumSquares.accelX - (sum.accelX ** 2 / size)) / size),
            ((sumSquares.accelY - (sum.accelY ** 2 / size)) / size),
            ((sumSquares.accelZ - (sum.accelZ ** 2 / size)) / size));

        return MotionReading.euclideanDistance(variance, new MotionReading(0, 0, 0));
    }

}



export class Match {

    constructor(
        public distance: number,
        public startTime: number,
        public endTime: number,
        public gestureClass: number) {
    }

    public get duration(): number {
        return this.endTime - this.startTime;
    }

    public get isValid(): boolean {
        return this.startTime > 0 || this.endTime > 0;
    }
}


export enum DataType {
    Integer = 0,
    Float = 1
}