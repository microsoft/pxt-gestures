import * as React from "react";
import { observer } from "mobx-react";
import { serialData } from "./serial-data";
import { observable } from "mobx";


const HALF_PI = Math.PI * 0.5;


@observer
export class DeviceOrientation extends React.Component<{}, {}> {
    @observable private roll: number;
    @observable private pitch: number;

    componentDidMount() {
        const filterX = createLowPassFilter();
        const filterY = createLowPassFilter();
        const filterZ = createLowPassFilter();
        serialData.register(data => {
            const x = filterX(data.accVec.X);
            const y = filterY(data.accVec.Y);
            const z = filterZ(data.accVec.Z);
            // Based on https://theccontinuum.com/2012/09/24/arduino-imu-pitch-roll-from-accelerometer/
            this.roll = Math.atan2(x, z);
            this.pitch = Math.atan2(y, Math.sqrt(x * x + z * z));
        });
    }

    public render() {
        const imgStyle: React.CSSProperties = {
            transformStyle: "preserve-3d",
            transform: "rotateY(" + (this.roll - Math.PI) + "rad) rotateX(" + this.pitch + "rad)",
            padding: 0
        };
        const backShowing = -HALF_PI <= this.roll && this.roll <= HALF_PI;
        const imgSource = backShowing ? "/circuitplayground-back.png" : "/circuitplayground-front.png";
        return (
            <div style={{ perspective: "500px" }}>
                <img src={imgSource} width={200} height={200} style={imgStyle} />
            </div>
        );
    }
}


const createLowPassFilter = () => {
    const alpha = 0.5;
    let previousSmoothed = 0;
    return (value: number) => {
        const smoothed = alpha * value + (1 - alpha) * previousSmoothed;
        previousSmoothed = smoothed;
        return smoothed;
    }
}
