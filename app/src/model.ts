import { findThreshold, DTW, DBA } from './algorithms';
import { MotionReading, Match, GestureExampleData } from './motion';



export class SingleDTWCore {
    private classNumber: number;
    private gestureName: string;
    private description: string;
    private dtw: DTW<MotionReading>;
    private dba: DBA<MotionReading>;
    private averageMotion: MotionReading[];
    public threshold: number;
    private running: boolean;
    private avgMotionLength: number;

    // used for generating unique event source IDs to be used in the custom.ts gesture block's code:
    private static EVENT_SRC_ID_COUNTER: number = 0;
    private eventSourceId: number;


    public isRunning() {
        return this.running;
    }

    public enableRunning() {
        this.running = true;
    }

    public getTick() {
        return this.dtw.getTick();
    }

    constructor(classNum: number, gestureName: string) {
        this.classNumber = classNum;
        this.dba = new DBA<MotionReading>(MotionReading.euclideanDistanceFast, MotionReading.mean);
        this.running = false;
        // call update to generate the referencePrototype and threshold
        // this.Update(initialData);
        // this.dtw = new Algorithms.SpringAlgorithm<Vector>(this.refPrototype, this.threshold, this.classNumber, this.avgLength, Algorithms.EuclideanDistanceFast);

        this.eventSourceId = 875 + SingleDTWCore.EVENT_SRC_ID_COUNTER;
        SingleDTWCore.EVENT_SRC_ID_COUNTER++;
        this.gestureName = gestureName;
    }


    public updateName(newName: string) {
        this.gestureName = newName;
    }


    public update(motionExamples: MotionReading[][], startTime: number) {
        if (motionExamples.length == 0) {
            // reset
            this.running = false;
            this.avgMotionLength = 0;
            this.threshold = 0;
            this.averageMotion = [];
            return;
        }

        // split data
        let trainData: MotionReading[][] = [];
        let thresholdData: MotionReading[][] = [];
        let sumSeriesLengths = 0;

        for (let i = 0; i < motionExamples.length; i++) {
            if (i % 2 == 0) trainData.push(motionExamples[i]);
            else thresholdData.push(motionExamples[i]);

            sumSeriesLengths += motionExamples[i].length;
        }

        this.avgMotionLength = Math.round(sumSeriesLengths / motionExamples.length);
        this.averageMotion = this.dba.computeAverageSeries(trainData, 10, 0.01);
        this.threshold = findThreshold(thresholdData, this.averageMotion, this.avgMotionLength, MotionReading.euclideanDistanceFast);
        this.dtw = new DTW<MotionReading>(this.averageMotion, startTime, this.threshold, this.classNumber, this.avgMotionLength, MotionReading.euclideanDistanceFast);
        this.running = true;
    }


    public get prototype() {
        let mainSample = new GestureExampleData();
        mainSample.motion = this.averageMotion;
        mainSample.cropEndIndex = this.averageMotion.length - 1;
        mainSample.cropStartIndex = 0;
        mainSample.startTime = 0;
        mainSample.endTime = 0;
        mainSample.videoLink = null;
        return mainSample;
    }


    public feed(xt: MotionReading): Match {
        return this.dtw.feed(xt);
    }

    // make sure that it's not conflicting with any of these event ids:
    // https://github.com/Microsoft/pxt-common-packages/blob/master/libs/core/dal.d.ts

    // this will just generate the namespace along with the algorithms.
    // it will then be populated with each gesture.GenerateBlock();
    public static generateNamespace(generatedCodeBlocks: string[]): string {
        return `namespace Gestures {
${generatedCodeBlocks.join('\n')}
}
`;
    }


    // will just return 
    public generateBlock(): string {
        let uniqueId: string = this.classNumber.toString();
        // TODO: make sure that gesture names are unique (within a program) => otherwise ask the user to change/delete or merge their data.
        // TODO: this will definitely break if the user enters numbers or ...
        // FIX: if we merge all of the gestures into a single gesture block with a dropdown to select from, then it will be fixed.
        let functionName = this.gestureName.replace(' ', '');
        functionName = functionName.charAt(0).toUpperCase().concat(functionName.substr(1, functionName.length - 1));

        let event_src_id_varName = `MY_EVENT_SRC${uniqueId}`;
        let initialized_varName = `__isInitialized${uniqueId}`;
        let initializePredictor_funName = `__initializePredictor${uniqueId}`;
        // let predictor_funName = `__predictor${uniqueId}`;
        let gesture_funName = `onGesture${functionName}`;
        let description = this.description;

        let blockCode = `// Auto generated code, do not edit.
    const ${event_src_id_varName}: number = ${this.eventSourceId.toString()};
    let ${initialized_varName}: boolean = false;

    /**
    * ${description}
    */
    //% blockId=gesture_block_${uniqueId} block="on gesture ${this.gestureName}"
    export function ${gesture_funName}(elements: () => void) {
        if (!${initialized_varName})
            ${initializePredictor_funName}();

        control.onEvent(${event_src_id_varName}, 1, elements);
    }

    function ${initializePredictor_funName}() {
        ${initialized_varName} = true;

        control.runInBackground(() => {
            const threshold = ${this.threshold};
            const avgLength = ${this.avgMotionLength};
            const refPrototype = ${this.vecArrayToString(this.averageMotion)};
            const spring = new SpringAlgorithm(refPrototype, threshold, avgLength);

            while (true) {
                const x = input.acceleration(Dimension.X);
                const y = input.acceleration(Dimension.Y);
                const z = input.acceleration(Dimension.Z);

                if (spring.feed(new Vector(x, y, z)) == 1)
                    control.raiseEvent(${event_src_id_varName}, 1);

                loops.pause(40);    //almost 25fps
            }
        });
    }
`;

        return blockCode;
    }


    private vecArrayToString(vec: MotionReading[]): string {
        return '[' + vec.map(v => `new Vector(${v.accelX}, ${v.accelY}, ${v.accelZ})`).join(',\n') + ']';
    }
}