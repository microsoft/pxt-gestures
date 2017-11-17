import * as Algorithms from './algorithms';
import { Vector, Match, GestureSample } from './types';

export class SingleDTWCore {
    private classNumber: number;
    private gestureName: string;
    private description: string;

    private dtw: Algorithms.DTW<Vector>;
    private dba: Algorithms.DBA<Vector>;

    private refPrototype: Vector[];
    public threshold: number;
    public avgLength: number;

    private running: boolean;

    // used for generating unique event source IDs to be used in the custom.ts gesture block's code:
    private static EVENT_SRC_ID_COUNTER: number = 0;
    private eventSourceId: number;


    public isRunning() {
        return this.running;
    }

    public EnableRunning() {
        this.running = true;
    }

    public getTick() {
        return this.dtw.getTick();
    }

    constructor(classNum: number, gestureName: string) {
        this.classNumber = classNum;
        this.dba = new Algorithms.DBA<Vector>(Algorithms.EuclideanDistanceFast, Algorithms.Average);
        this.running = false;
        // call update to generate the referencePrototype and threshold
        // this.Update(initialData);
        // this.dtw = new Algorithms.SpringAlgorithm<Vector>(this.refPrototype, this.threshold, this.classNumber, this.avgLength, Algorithms.EuclideanDistanceFast);

        this.eventSourceId = 875 + SingleDTWCore.EVENT_SRC_ID_COUNTER;
        SingleDTWCore.EVENT_SRC_ID_COUNTER++;
        this.gestureName = gestureName;
    }


    public UpdateName(newName: string) {
        this.gestureName = newName;
    }


    public UpdateDescription(newDescription: string) {
        this.description = newDescription;
    }


    public Update(data: Vector[][]) {
        if (data.length == 0) {
            // reset
            this.running = false;
            this.avgLength = 0;
            this.threshold = 0;
            this.refPrototype = [];

            return;
        }
        // split data
        let trainData: Vector[][] = [];
        let thresholdData: Vector[][] = [];
        let lengthSum = 0;

        for (let i = 0; i < data.length; i++) {
            if (i % 2 == 0) trainData.push(data[i]);
            else thresholdData.push(data[i]);

            lengthSum += data[i].length;
        }

        this.avgLength = Math.round(lengthSum / data.length);

        this.refPrototype = Algorithms.roundVecArray(this.dba.computeKMeans(trainData, 1, 10, 10, 0.01)[0].mean);
        this.threshold = Math.round(Algorithms.findMinimumThreshold(thresholdData, this.refPrototype, this.avgLength, Algorithms.EuclideanDistanceFast, 0.1, 5));

        // update the Spring algorithm
        // reset the Spring algorithm
        this.dtw = new Algorithms.DTW<Vector>(this.refPrototype, this.threshold, this.classNumber, this.avgLength, Algorithms.EuclideanDistanceFast);
        this.running = true;
    }

    public GetMainPrototype() {
        let mainSample = new GestureSample();
        mainSample.rawData = this.refPrototype;
        mainSample.cropEndIndex = this.refPrototype.length - 1;
        mainSample.cropStartIndex = 0;
        mainSample.startTime = 0;
        mainSample.endTime = 0;
        mainSample.videoLink = null;

        return mainSample;
    }


    public Feed(xt: Vector): Match {
        return this.dtw.Feed(xt);
    }

    // make sure that it's not conflicting with any of these event ids:
    // https://github.com/Microsoft/pxt-common-packages/blob/master/libs/core/dal.d.ts

    // this will just generate the namespace along with the algorithms.
    // it will then be populated with each gesture.GenerateBlock();
    public static GenerateNamespace(generatedCodeBlocks: string[]): string {
        return `namespace Gestures {
${generatedCodeBlocks.join('\n')}
}
`;
    }


    // will just return 
    public GenerateBlock(): string {
        let uniqueId: string = this.classNumber.toString();
        // TODO: make sure that gesture names are unique (within a program) => otherwise ask the user to change/delete or merge their data.
        // TODO: this will definitely break if the user enters numbers or ...
        // FIX: if we merge all of the gestures into a single gesture block with a dropdown to select from, then it will be fixed.
        let functionName = this.gestureName.replace(' ', '');
        functionName = functionName.charAt(0).toUpperCase().concat(functionName.substr(1, functionName.length - 1));

        let event_src_id_varName = `MY_EVENT_SRC${uniqueId}`;
        let initialized_varName = `__isInitialized${uniqueId}`;
        let initializePredictor_funName = `__initializePredictor${uniqueId}`;
        let predictor_funName = `__predictor${uniqueId}`;
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
            const avgLength = ${this.avgLength};
            const refPrototype = ${this.vecArrayToString(this.refPrototype)};
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


    private vecArrayToString(vec: Vector[]): string {
        return '[' + vec.map(v => `new Vector(${v.X}, ${v.Y}, ${v.Z})`).join(',\n') + ']';
    }
}