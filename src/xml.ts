import path from 'node:path'
import assert from 'node:assert'
import { Builder, parseStringPromise } from 'xml2js'
import { $ } from 'bun'
import type { Maybe } from '../lib'

const builder = new Builder()

export interface Options {
    bunVersion?: string
    ciJobUrl?: string
}
export async function processJUnitReport(
    reportPath: string,
    suiteName: string,
    options: Options = {}
): Promise<string> {
    const { bunVersion, ciJobUrl } = options
    const root = path.dirname(reportPath)

    let commit: string | undefined
    try {
        commit = await $.cwd(root)`git rev-parse --short HEAD`
            .text()
            .then(hash => hash.trim())
    } catch (e) {
        // log error, but keep going
        console.error('Error getting commit hash:', e)
    }
    const reportRaw = await Bun.file(reportPath).text()

    // see:
    // - junit xml overview: https://github.com/testmoapp/junitxml
    // - junit xml schema:   https://github.com/windyroad/JUnit-Schema/blob/master/JUnit.xsd
    const report = await parseStringPromise(reportRaw)
    assert(
        report.testsuites &&
            '$' in report.testsuites &&
            Array.isArray(report.testsuites.testsuite),
        'Invalid JUnit report'
    )
    report.testsuites['$'].name = suiteName

    const cwd = process.cwd()
    const makeRelativeToCwd = (file: string) =>
        path.relative(cwd, path.resolve(root, file))
    const hasProperties = commit || bunVersion || ciJobUrl

    for (const suite of report.testsuites.testsuite) {
        // make suite and test case file paths relative to ecosystem root
        // instead of the tested project's root.
        assert(suite['$'])
        const name = suite['$'].name
        assert(typeof name === 'string')
        suite['$'].name = makeRelativeToCwd(name)

        for (const testcase of suite.testcase) {
            const file = testcase['$'].file
            assert(typeof file === 'string')
            testcase['$'].file = makeRelativeToCwd(file)
        }

        /*
            Add properties to each <testsuite>, e.g.
            <properties>
                <property name="commit" value="abc123" /> <!-- commit of repo being tested -->
                <property name="version" value="0.1.0" /> <!-- bun version -->
            </properties>
        */
        if (hasProperties) {
            const propertiesChild = (suite.properties ??= {})
            propertiesChild.property = makeProperties(
                {
                    commit,
                    version: bunVersion,
                    ci: ciJobUrl,
                },
                propertiesChild.property ?? []
            )
        }
    }

    return builder.buildObject(report)
}

type Property = {
    $: {
        name: string
        value: string
    }
}
const makeProperties = (
    properties: Record<string, Maybe<string>>,
    existing: Property[] = []
) =>
    Object.entries(properties).reduce((properties, [name, value]) => {
        if (value)
            properties.push({
                $: {
                    name,
                    value,
                },
            })
        return properties
    }, existing)

if (Bun.main == import.meta.path) {
    const [, , reportPath, suiteName] = Bun.argv
    if (!reportPath) {
        throw new Error('Please provide the path to the JUnit report XML file.')
    }
    if (!suiteName) {
        throw new Error('Please provide the suite name.')
    }

    processJUnitReport(reportPath, suiteName)
        .then(console.log)
        .catch(err => {
            console.error('Error processing JUnit report:', err)
            process.exit(1)
        })
}
