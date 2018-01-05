import * as React from "react";
import { observer } from "mobx-react";
import { gestureStore, Orientation } from "./gesture-store";


const HALF_PI = Math.PI * 0.5;

export function getStyleForOrientation(orientation: Orientation): React.CSSProperties {
    return {
        transformStyle: "preserve-3d",
        transform: "rotateY(" + (orientation.roll - Math.PI) + "rad) rotateX(" + orientation.pitch + "rad)",
        padding: 0
    };
}

export interface OrientedDeviceProps {
    width: number;
    height: number;
}

@observer
export class OrientedDevice extends React.Component<OrientedDeviceProps, {}> {

    public render() {
        const orientation = gestureStore.currentOrientation;
        const backShowing = -HALF_PI <= orientation.roll && orientation.roll <= HALF_PI;
        const imgSource = backShowing ? "/circuitplayground-back.png" : "/circuitplayground-front.png";
        return (
            <div style={{ perspective: "500px", zIndex: 99, top: 0, left: 0, position: 'absolute' }}>
                <img
                    src={imgSource}
                    width={this.props.width}
                    height={this.props.height}
                    style={getStyleForOrientation(orientation)}
                />
            </div>
        );
    }
}
