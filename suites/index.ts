import type { EcosystemSuite } from '../lib/test-suite'
import foundationRegression from './foundation-regression'

const suites: Record<string, EcosystemSuite> = {
    foundationRegression,
}
export default suites;
