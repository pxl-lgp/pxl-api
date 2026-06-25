import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from './features';

export const FEATURE_KEY = 'featureKey';

export const Feature = (featureKey: FeatureKey) => SetMetadata(FEATURE_KEY, featureKey);
