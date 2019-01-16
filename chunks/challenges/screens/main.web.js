import React from 'react'
import { Screen, Components } from 'react-dom-chunky'
import { Row, Col, Radio, Tag } from 'antd'
import ChallengeCard from '../components/challengeCard'
import InitialChallenge from '../components/initialChallenge'
import Challenge from '../components/Challenge'
import { Data } from 'react-chunky'

export default class MainChallengesScreen extends Screen {
  constructor(props) {
    super(props)
    this.state = {
      ...this.state,
      initialChallengeCompleted: false,
      selectedPricePlan: 'all',
      selectedCategories: []
    }
  }

  componentDidMount() {
    super.componentDidMount()
    this._examples = this.importData('initial')
    this._plans = this.importData('pricePlans')
    this.setState({
      initial: this.examples
    })
    this._challenge = this.props.location.pathname.split('/')[2]
    this.props.getUserProfile()
    // Data.Cache.retrieveCachedItem('initialChallengeCompleted')
    //   .then(() => {
    //     this.setState({ initialChallengeCompleted: true })
    //   })
    //   .catch(error => {
    //     this.setState({ initialChallengeCompleted: false })
    //   })
  }

  profileOk(profile) {
    console.log('profile', profile)
  }

  get examples() {
    return this._examples || {}
  }

  get pricePlans() {
    return this._plans || []
  }

  get challenge() {
    return this._challenge
  }

  handlePriceChange = ev => {
    this.setState({ selectedPricePlan: ev.target.value })
  }

  addCategory = category => {
    let { selectedCategories } = this.state
    if (category && selectedCategories.indexOf(category) === -1) {
      selectedCategories = [...selectedCategories, category]
    }
    if (this.state.selectedCategories.find(c => c === category)) {
      return
    }

    this.setState({
      selectedCategories
    })
  }

  removeCategory = removedCategory => {
    const selectedCategories = this.state.selectedCategories.filter(
      category => category !== removedCategory
    )
    this.setState({ selectedCategories })
  }

  renderSelection() {
    return (
      <div
        style={{
          padding: '10px 30px',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Radio.Group
          defaultValue="all"
          buttonStyle="solid"
          onChange={this.handlePriceChange}
        >
          {this.pricePlans.map(plan => (
            <Radio.Button value={plan}>{plan.toUpperCase()}</Radio.Button>
          ))}
        </Radio.Group>
      </div>
    )
  }

  renderTags() {
    return (
      <div
        style={{
          padding: '5px 30px',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        {this.state.selectedCategories.map(category => (
          <Tag
            key={category}
            closable
            afterClose={() => this.removeCategory(category)}
          >
            {category}
          </Tag>
        ))}
      </div>
    )
  }

  renderChallenges() {
    const challengesData = require('challenges/index.json')
    const { selectedCategories, selectedPricePlan } = this.state
    const filter = {}

    for (let i = 0; i < selectedCategories.length; i++) {
      filter[selectedCategories[i]] = selectedCategories[i]
    }
    let filteredChallenges =
      selectedPricePlan === 'all'
        ? challengesData
        : challengesData.filter(
            challenge => challenge.pricePlan === this.state.selectedPricePlan
          )

    if (Object.keys(filter).length > 0) {
      filteredChallenges = filteredChallenges.filter(challenge => {
        for (var key in filter) {
          if (challenge.category.find(c => c === filter[key])) {
            return true
          }
        }
        return false
      })
    }

    return (
      <div>
        <Components.Text
          source={'local://challenges-intro'}
          style={{
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
        />
        {this.renderSelection()}
        {this.renderTags()}
        <Row gutter={26} style={{ padding: '20px' }}>
          {true ? (
            <React.Fragment>
              {filteredChallenges.length ? (
                filteredChallenges.map(challenge => (
                  <Col span={16} offset={4} style={{ padding: '20px' }}>
                    <ChallengeCard
                      challenge={require(`../../../challenges/${
                        challenge.id
                      }/index.json`)}
                      onSelectChallenge={selectedChallenge =>
                        this.props.history.push(
                          `/challenges/${selectedChallenge.id}`
                        )
                      }
                      onCategoryClick={category => this.addCategory(category)}
                    />
                  </Col>
                ))
              ) : (
                <Col
                  span={16}
                  offset={4}
                  style={{ padding: '20px', height: '475px' }}
                >
                  <p>Sorry we can't find the challenges you are looking for.</p>
                </Col>
              )}
            </React.Fragment>
          ) : (
            <Col span={16} offset={4}>
              <ChallengeCard
                challenge={require(`../../../challenges/initial/index.json`)}
                onSelectChallenge={() =>
                  this.props.history.push(`/challenges/initial`)
                }
                onCategoryClick={category => this.addCategory(category)}
              />
            </Col>
          )}
        </Row>
      </div>
    )
  }

  pushActivity(activity) {
    this.props.newActivity(activity)
  }

  components() {
    return super
      .components()
      .concat([
        <div style={{ width: '100vw', marginTop: '50px' }}>
          {this.challenge ? (
            <Challenge
              challengeId={this.challenge}
              challenge={require(`../../../challenges/${
                this.challenge
              }/index.json`)}
              showChallenges={() => this.props.history.goBack()}
              pushActivity={activity => this.pushActivity(activity)}
            />
          ) : (
            this.renderChallenges()
          )}
        </div>
      ])
  }
}