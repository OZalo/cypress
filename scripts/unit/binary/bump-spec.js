const la = require('lazy-ass')
const snapshot = require('snap-shot-it')
const _ = require('lodash')

const bump = require('../../binary/bump')

/* eslint-env mocha */
describe('bump', () => {
  context('remapProjects', () => {
    it('returns flat list of projects', () => {
      la(bump._PROVIDERS, 'has _PROVIDERS', bump)
      const list = bump.remapProjects(bump._PROVIDERS)

      snapshot('list of all projects', list)
    })
  })

  context('getFilterByProvider', () => {
    it('returns a filter function without provider name', () => {
      const projects = bump.remapProjects(bump._PROVIDERS)
      const filter = bump.getFilterByProvider()
      // should return ALL projects
      const filtered = projects.filter(filter)

      la(
        _.isEqual(filtered, projects),
        'should have kept all projects',
        filtered,
      )
    })

    it('returns a filter function for circle and linux', () => {
      const projects = bump.remapProjects(bump._PROVIDERS)

      la(
        projects.length,
        'there should be at least a few projects in the list of projects',
        projects,
      )

      const filter = bump.getFilterByProvider('circle', 'linux')
      const filtered = projects.filter(filter)

      la(filtered.length, 'there should be at least a few projects', filtered)
      snapshot('should have just circle and linux projects', filtered)
    })
  })
})
