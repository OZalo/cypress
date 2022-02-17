import TestingTypePicker from './TestingTypePicker.vue'
import { TestingTypePickerFragmentDoc } from '../generated/graphql-test'
import { defaultMessages } from '@cy/i18n'

const { component, e2e } = defaultMessages.testingType

describe('TestingTypePicker', () => {
  it('renders "configured" and "not configured" states', () => {
    const pick = cy.spy().as('pick')

    cy.mountFragment(TestingTypePickerFragmentDoc, {
      onResult (result) {
        if (result.currentProject) {
          result.currentProject.isCTConfigured = true
          result.currentProject.isE2EConfigured = false
        }
      },
      render: (gql) => {
        return <TestingTypePicker gql={gql} onPick={pick} isApp={false}/>
      },
    })

    cy.get('[data-cy-testingtype="e2e"]').within(() => {
      cy.contains(e2e.name).should('be.visible')
      cy.contains(e2e.description).should('be.visible')
      cy.contains(defaultMessages.setupPage.testingCard.notConfigured).should('be.visible')
    })

    cy.get('[data-cy-testingtype="component"]').within(() => {
      cy.contains(component.name).should('be.visible')
      cy.contains(component.description).should('be.visible')
      cy.contains(defaultMessages.setupPage.testingCard.configured).should('be.visible')
    })

    cy.percySnapshot('before click')

    cy.contains(e2e.name).click()
    cy.contains(component.name).click()
    cy.get('@pick').should('have.been.calledTwice')

    cy.percySnapshot('after click - focus')
  })
})
