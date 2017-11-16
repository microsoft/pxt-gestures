import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as gesture from "./gesture"
import './index.css';

ReactDOM.render(
  <gesture.GestureToolbox />,
  document.getElementById('root') as HTMLElement
);
