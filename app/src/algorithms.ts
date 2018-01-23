import { MotionReading, Match } from './motion';


const INF = 1e10;

/*
Implement the SPRING algorithm in the paper:

[1] Sakurai, Y., Faloutsos, C., & Yamamuro, M. (2007, April). 
Stream monitoring under the time warping distance. 
In 2007 IEEE 23rd International Conference on Data Engineering (pp. 1046-1055). IEEE.
*/

export class SpringAlgorithm<SampleType> {
    private querySequence: SampleType[];
    private threshold: number;
    private classNumber: number;

    private queryLen: number;

    private distFunction: (a: SampleType, b: SampleType) => number;

    private minLen: number;
    private maxLen: number;

    private start: number[];
    private dist: number[];
    private start_prev: number[];
    private dist_prev: number[];
    private start_retired: number[];
    private dist_retired: number[];

    private dist_min: number;

    private time: number;
    private startTime: number;
    private endTime: number;


    constructor(
        querySequence: SampleType[],
        private globalStartTime: number,
        threshold: number,
        classNum: number,
        avgProtoLen: number,
        distFun: (a: SampleType, b: SampleType) => number
    ) {
        this.querySequence = querySequence;
        this.threshold = threshold;
        this.classNumber = classNum;
        this.queryLen = querySequence.length;
        this.distFunction = distFun;
        this.minLen = avgProtoLen * 7 / 10;
        this.maxLen = avgProtoLen * 13 / 10;

        this.dist_prev = Array(this.queryLen + 1).fill(INF); this.dist_prev[0] = 0;
        this.start_prev = Array(this.queryLen + 1).fill(0);
        this.dist_retired = Array(this.queryLen + 1).fill(0);
        this.start_retired = Array(this.queryLen + 1).fill(0);

        this.dist_min = INF;
        this.time = 0;
        this.startTime = 0;
        this.endTime = 0;
    }


    public feed(xt: SampleType): Match {
        let match: Match = undefined;

        // Reuse these arrays to keep from allocating new arrays during recognition
        this.dist = this.dist_retired;
        this.start = this.start_retired;

        this.dist[0] = 0;
        this.start[0] = this.time;

        for (let i = 1; i <= this.queryLen; i++) {
            const dist = this.distFunction(this.querySequence[i - 1], xt);

            if (this.dist[i - 1] <= this.dist_prev[i] && this.dist[i - 1] <= this.dist_prev[i - 1]) {
                this.dist[i] = dist + this.dist[i - 1];
                this.start[i] = this.start[i - 1];
            } else if (this.dist_prev[i] <= this.dist[i - 1] && this.dist_prev[i] <= this.dist_prev[i - 1]) {
                this.dist[i] = dist + this.dist_prev[i];
                this.start[i] = this.start_prev[i];
            } else {
                this.dist[i] = dist + this.dist_prev[i - 1];
                this.start[i] = this.start_prev[i - 1];
            }
        }

        if (this.dist_min <= this.threshold) {
            let matchLength = this.endTime - this.startTime;

            if (this.minLen < matchLength && matchLength < this.maxLen &&
                forAll(0, this.queryLen, i => this.dist[i] >= this.dist_min && this.start[i] > this.endTime)) {

                match = new Match(this.dist_min,
                    this.globalStartTime + this.startTime - 1,
                    this.globalStartTime + this.endTime - 1,
                    this.classNumber);

                this.dist_min = INF;

                for (let i = 1; i <= this.queryLen; i++) {
                    if (this.start[i] <= this.endTime) {
                        this.dist[i] = INF;
                    }
                }
            }
        }

        if (this.dist[this.queryLen] <= this.threshold && this.dist[this.queryLen] < this.dist_min) {
            this.dist_min = this.dist[this.queryLen];
            this.startTime = this.start[this.queryLen];
            this.endTime = this.time;
        }

        // We can "retire" the prev arrays for future use.
        this.dist_retired = this.dist_prev;
        this.start_retired = this.start_prev;

        this.dist_prev = this.dist;
        this.start_prev = this.start;
        this.time++;

        return match;
    }


    public findMatches(data: SampleType[]) {
        return data.map(d => this.feed(d)).filter(m => m);
    }

}


export class RC4RandomGenerator {
    // Based on the RC4 random generator. See https://en.wikipedia.org/wiki/RC4
    // Ported from the Multiclass ModelTracker (now called Squares) project (originally in Javascript, now in Typescript).

    private S: number[];
    private i: number;
    private j: number;


    // Initialze the algorithm with a seed.
    constructor(seed: string | number[]) {
        this.S = [];
        this.i = 0;
        this.j = 0;
        for (let i = 0; i < 256; i++) {
            this.S[i] = i;
        }
        if (seed) {
            if (typeof (seed) === 'string') {
                const seed_as_string = seed as string;
                const aseed: number[] = [];
                for (let i = 0; i < seed.length; i++) { aseed[i] = seed_as_string.charCodeAt(i); }
                seed = aseed;
            }
            let j = 0;
            for (let i = 0; i < 256; i++) {
                j += this.S[i] + (seed as number[])[i % seed.length];
                j %= 256;
                const t = this.S[i]; this.S[i] = this.S[j]; this.S[j] = t;
            }
        }
    }


    // Compute the next byte and update internal states.
    public nextByte(): number {
        this.i = (this.i + 1) % 256;
        this.j = (this.j + this.S[this.i]) % 256;
        const t = this.S[this.i]; this.S[this.i] = this.S[this.j]; this.S[this.j] = t;
        return this.S[(this.S[this.i] + this.S[this.j]) % 256];
    }

    // Generate a random number from [ 0, 1 ] uniformally.
    public uniform(): number {
        // Generate 6 bytes.
        let value = 0;
        for (let i = 0; i < 6; i++) {
            value *= 256;
            value += this.nextByte();
        }
        return value / 281474976710656;
    }

    // Generate a random integer from min to max (both inclusive).
    public randint(min: number, max: number): number {
        let value = 0;
        for (let i = 0; i < 6; i++) {
            value *= 256;
            value += this.nextByte();
        }
        return value % (max - min + 1) + min;
    }

    // Choose K numbers from 0 to N - 1 randomly.
    // Using Algorithm R by Jeffrey Vitter.
    public choose(n: number, k: number): number[] {
        const chosen: number[] = [];
        for (let i = 0; i < k; i++) {
            chosen[i] = i;
        }
        for (let i = k; i < n; i++) {
            const j = this.randint(0, i);
            if (j < k) {
                chosen[j] = i;
            }
        }
        return chosen;
    }
}


enum Direction { NIL, LEFT, UP, DIAGONAL }


export class DBA<SampleType> { // DTW Barycenter Average
    /*
    Implements the DBA algorithm in:

    [1] Petitjean, F., Ketterlin, A., & Gançarski, P. (2011). 
    A global averaging method for dynamic time warping, with applications to clustering. 
    Pattern Recognition, 44(3), 678-693.

    [2] Petitjean, F., Forestier, G., Webb, G. I., Nicholson, A. E., Chen, Y., & Keogh, E. (2014, December). 
    Dynamic time warping averaging of time series allows faster and more accurate classification. 
    In 2014 IEEE International Conference on Data Mining (pp. 470-479). IEEE.
    */

    constructor(
        private computeDistance: (a: SampleType, b: SampleType) => number,
        private computeBarycenter: (x: SampleType[]) => SampleType
    ) {
    }


    private dynamicTimeWarp(a: SampleType[], b: SampleType[]): { distance: number, path: [number, number][] } {
        const matrix: { cost: number, direction: Direction }[][] = [];
        for (let i = 0; i <= a.length; i++) {
            matrix[i] = [];
            for (let j = 0; j <= b.length; j++) {
                matrix[i][j] = { cost: 1e20, direction: Direction.NIL };
            }
        }
        matrix[0][0] = { cost: 0, direction: Direction.NIL };
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = this.computeDistance(a[i - 1], b[j - 1]);
                const leftCost = matrix[i - 1][j].cost;
                const upCost = matrix[i][j - 1].cost;
                const diagCost = matrix[i - 1][j - 1].cost;
                if (leftCost <= upCost && leftCost <= diagCost) {
                    matrix[i][j] = { cost: cost + leftCost, direction: Direction.LEFT };
                } else if (upCost <= leftCost && upCost <= diagCost) {
                    matrix[i][j] = { cost: cost + upCost, direction: Direction.UP };
                } else {
                    matrix[i][j] = { cost: cost + diagCost, direction: Direction.DIAGONAL };
                }
            }
        }
        const path: [number, number][] = [];
        let i = a.length; let j = b.length;
        while (i > 0 && j > 0) {
            path.push([i - 1, j - 1]);
            switch (matrix[i][j].direction) {
                case Direction.LEFT: i -= 1; break;
                case Direction.UP: j -= 1; break;
                case Direction.DIAGONAL: i -= 1; j -= 1; break;
                default: break;
            }
        }
        return { distance: matrix[a.length][b.length].cost, path: path.reverse() };
    }


    public computeAverageSeries(seriesList: SampleType[][], iterations: number, TOL: number): SampleType[] {
        // Initialize the average series naively to the first series.
        // TODO: Implement better initialization methods, see [1] for more detail.
        let avgSeries = seriesList[0];
        for (let i = 0; i < iterations; i++) {
            // Do one DBA iteration, return the average amount of update (in the distanceFunction).
            // Usually 5-10 iterations is sufficient to get a good average series.
            // You can also test if the returned value (the average update distance of this iteration) 
            // is sufficiently small to determine convergence.
            const alignments: SampleType[][] = [];
            for (let i = 0; i < avgSeries.length; i++) {
                alignments[i] = [];
            }
            for (const series of seriesList) {
                const path = this.dynamicTimeWarp(avgSeries, series).path;
                for (const [i, j] of path) {
                    alignments[i].push(series[j]);
                }
            }
            avgSeries = alignments.map(this.computeBarycenter);
            const change = avgSeries.map((k, i) =>
                this.computeDistance(k, avgSeries[i])).reduce((a, b) => a + b, 0) / avgSeries.length;
            if (change < TOL) { break; }
        }
        return avgSeries;
    }


    private computeVariance(series: SampleType[][], center: SampleType[]): number {
        if (series.length < 3) { return 0; }
        const distances = series.map(s => this.dynamicTimeWarp(s, center).distance);
        let sumsq = 0;
        for (const d of distances) { sumsq += d * d; }
        return Math.sqrt(sumsq / (distances.length - 1));
    }


    public computeKMeans(
        series: SampleType[][],
        k: number,
        kMeansIterations: number = 10,
        abcIterations: number = 10,
        dbaTolerance: number = 0.01
    ): { variance: number, centroid: SampleType[] }[] {

        if (k > series.length) {
            return series.map(s => ({ variance: 0, centroid: s }));
        }
        if (k === 1) {
            const centroid = this.computeAverageSeries(series, abcIterations, dbaTolerance);
            return [{ variance: this.computeVariance(series, centroid), centroid }];
        }
        const random = new RC4RandomGenerator('Labeling');
        const maxIterations = kMeansIterations;

        const assignSeriesToCentroids = (centroids: SampleType[][]) => {
            const classSeries: SampleType[][][] = [];
            for (let i = 0; i < k; i++) { classSeries[i] = []; }
            for (const s of series) {
                let minD: number = null;
                let minI: number = null;
                for (let i = 0; i < k; i++) {
                    const d = this.dynamicTimeWarp(centroids[i], s).distance;
                    if (minI === null || d < minD) {
                        minI = i;
                        minD = d;
                    }
                }
                classSeries[minI].push(s);
            }
            return classSeries;
        };

        const centroids = random.choose(series.length, k).map(i => series[i]);
        let assigned = assignSeriesToCentroids(centroids);

        // KMeans iterations.
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Update means.
            for (let i = 0; i < k; i++) {
                centroids[i] = this.computeAverageSeries(assigned[i], abcIterations, dbaTolerance);
            }
            assigned = assignSeriesToCentroids(centroids);
        }
        return centroids.map((centroid, i) => ({
            variance: this.computeVariance(assigned[i], centroid),
            centroid: centroid
        }));
    }
}




export function findThreshold(
    motions: MotionReading[][],
    motionPrototype: MotionReading[],
    avgMotionLen: number,
    computeDistance: (a: MotionReading, b: MotionReading) => number,
    step: number = 0.1,
    maxIterations: number = 5
): number {
    // TODO: slice the data into two random halves. run the avg algorithm on one half and then compute the threshold using the other half.
    let threshold = 0;
    let variance = MotionReading.variance(motions);
    let iterateMore = true;
    let i = 0;

    const testSignal = (motion: MotionReading[]) =>
        MotionReading.randomMotion(10)
            .concat(motion)
            .concat(MotionReading.randomMotion(10));

    do {
        let spring = new SpringAlgorithm<MotionReading>(motionPrototype, 0, threshold, 1, avgMotionLen, computeDistance);

        const matchedAll = motions.every(motion =>
            spring.findMatches(testSignal(motion)).length > 0);

        if (matchedAll) {
            iterateMore = false;
        }
        i++;
        if (i > maxIterations) { break; }

        threshold = i * step * variance;
    } while (iterateMore);

    return threshold;
}

function forAll(min: number, max: number, pred: (i: number) => boolean): boolean {
    let okay = true;
    for (let i = min; okay && i <= max; i++)
        if (!pred(i))
            okay = false;
    return okay;
}