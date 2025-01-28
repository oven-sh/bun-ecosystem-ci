import type { EcosystemSuite } from '../lib/test-suite'
import foundationRegression from './foundation-regression'
import ossApps from './oss-apps'

const suites: Record<string, EcosystemSuite> = {
    foundationRegression,
    'oss applications': ossApps,
}
export default suites
