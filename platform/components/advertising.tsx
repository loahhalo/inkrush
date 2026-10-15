import {adReady} from '../shared/measurement.ts';
import FutureAd from './future-ad.tsx';
export default function Advertising(){if(!adReady(process.env))return null;return <FutureAd client={process.env.INKRUSH_ADS_CLIENT!} slot={process.env.INKRUSH_ADS_SLOT!}/>;}
