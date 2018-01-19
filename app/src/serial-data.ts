import { MotionReading } from "./motion";

export class Observable<T> {
    private observers: ((data: T) => void)[] = [];

    public register(callback: (data: T) => void): void {
        this.observers.push(callback);
    }

    public unregister(callback: (data: T) => void): void {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    public notify(data: T) {
        this.observers.slice(0).forEach(h => h(data));
    }
}

export interface SerialData {
    acc: boolean;
    accVec: MotionReading;
}

export const serialData = new Observable<SerialData>();
