import { MotionReading, Match } from './motion';



export class DTW<SampleType> {
    private Y: SampleType[];
    private epsilon: number;
    private classNumber: number;

    private M: number;

    private distFunction: (a: SampleType, b: SampleType) => number;

    private minLen: number;
    private maxLen: number;

    private s: number[];
    private d: number[];
    private s1: number[];
    private d1: number[];
    private s2: number[];
    private d2: number[];

    private dmin: number;

    private t: number;
    private te: number;
    private ts: number;

    public getTick() {
        return this.t;
    }


    constructor(_refPrototype: SampleType[], private startTime: number, _threshold: number, _classNum: number, _avgProtoLen: number,
        _distFun: (a: SampleType, b: SampleType) => number) {
        this.Y = _refPrototype;
        this.epsilon = _threshold;
        this.classNumber = _classNum;

        this.M = _refPrototype.length;

        this.distFunction = _distFun;

        this.minLen = _avgProtoLen * 7 / 10;
        this.maxLen = _avgProtoLen * 13 / 10;

        this.d1 = [];
        this.s1 = [];
        this.d2 = [];
        this.s2 = [];

        for (let i = 0; i < this.M + 1; i++) {
            this.d1.push(0);
            this.s1.push(0);
            this.d2.push(0);
            this.s2.push(0);
        }

        for (let i = 1; i <= this.M; i++) {
            this.d1[i] = 1e10;
            this.s1[i] = 0;
        }

        this.dmin = 1e10;

        this.t = 0;
        this.ts = 0;
        this.te = 0;
    }


    public feed(xt: SampleType): Match {
        let match: Match = undefined;

        let t = this.t + 1;
        this.d = this.d2;
        this.s = this.s2;

        this.d[0] = 0;
        this.s[0] = t;

        // update M distances (d[] based on dp[]) and M starting points (s[] based on sp[]):
        for (let i = 1; i <= this.M; i++) {
            let dist = this.distFunction(this.Y[i - 1], xt);
            let di_minus1 = this.d[i - 1];
            let dip = this.d1[i];
            let dip_minus1 = this.d1[i - 1];

            // compute dbest and use that to compute s[i]
            if (di_minus1 <= dip && di_minus1 <= dip_minus1) {
                this.d[i] = dist + di_minus1;
                this.s[i] = this.s[i - 1];
            } else if (dip <= di_minus1 && dip <= dip_minus1) {
                this.d[i] = dist + dip;
                this.s[i] = this.s1[i];
            } else {
                this.d[i] = dist + dip_minus1;
                this.s[i] = this.s1[i - 1];
            }
        }

        if (this.dmin <= this.epsilon) {
            let matched = true;
            let matchLength = this.te - this.ts;

            if (matchLength > this.minLen && matchLength < this.maxLen) {

                for (let i = 0; i <= this.M; i++) {
                    if (this.d[i] < this.dmin && this.s[i] <= this.te) {
                        matched = false;
                        break;
                    }
                }

                if (matched) {
                    match = new Match(this.dmin,
                        this.startTime + this.ts - 1,
                        this.startTime + this.te - 1,
                        this.classNumber);
                    this.reset();
                }
            }
        }

        if (this.d[this.M] <= this.epsilon && this.d[this.M] < this.dmin) {
            this.dmin = this.d[this.M];
            this.ts = this.s[this.M];
            this.te = t;
        }

        this.d2 = this.d1; this.d1 = this.d;
        this.s2 = this.s1; this.s1 = this.s;
        this.t = t;

        return match;
    }

    public findMatches(data: SampleType[]) {
        return data.map(d => this.feed(d)).filter(m => m);
    }


    public reset() {
        this.dmin = 1e10;

        for (let i = 1; i <= this.M; i++) {
            if (this.s[i] <= this.te) {
                this.d[i] = 1e10;
            }
        }
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
                j += this.S[i] + (seed as number[]) [i % seed.length];
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
        let spring = new DTW<MotionReading>(motionPrototype, 0, threshold, 1, avgMotionLen, computeDistance);

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
