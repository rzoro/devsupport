import Analytics from 'universal-analytics';

const Store = require('electron-store');
const store = new Store();


console.log("load projects store");
const state = {
  userEmail: null,
  faq: {
    visibility: false,
    merchant: false,
  },
  projectDir: null,
  sessionAction: null,
  integration: null,
  reviewResultContent: null,
  nextIntegrations: [],
  identification: null,
  variables: [],
  secondStageVariables: [],
  variableValidations: [],
  changes: [],
  currentProject: null,
  error: null,
  results: {},
  contextMap: {},
  stage: 1,
  lastStage: 1,
  recentProjects: store.get("projects.recent", []),
  visitor: [],
  cid: store.get("cid")
};

const mutations = {
  SET_FAQ(state, merchant) {
    if (merchant === null) {
      state.faq.visibility = false;
      state.faq.merchant = false;
      return;
    }
    else {
      state.faq.visibility = true;
      state.faq.merchant = merchant;
    }


  },
  SET_USER_EMAIL(state, userEmail) {
    state.userEmail = userEmail;

  },
  SET_VARIABLE_VALIDATIONS(state, validations) {
    state.variableValidations = validations;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
  SET_RESULTS(state, results) {
    state.results = results;
  },
  SET_PROJECT_DIR(state, dir) {
    state.projectDir = dir;
    if (dir == null) {
      state.currentProject = null;
      state.name = null;
      return;
    }
    let parts = dir.split("/");
    state.name = parts[parts.length - 1];
    state.currentProject = {};
  },
  SET_CONTEXT_MAP(state, contextMap) {
    console.log("adding context values", contextMap);
    var newKeys = Object.keys(contextMap);
    for (var i = 0; i < newKeys.length; i++) {
      let newKey = newKeys[i];
      state.contextMap[newKey] = contextMap[newKey];
    }
  },
  CLEAR_CONTEXT_MAP(state) {
    state.contextMap = {};
  },
  SET_LAST_STAGE(state, lastStage) {
    state.lastStage = lastStage;
  },
  SET_STAGE(state, stage) {
    state.stage = stage;
  },
  SET_CHANGES(state, changes) {
    state.changes = changes;
  },
  SET_VARIABLES(state, variables) {
    console.log("set variableS", variables);
    state.variables = variables;
  },
  SET_SECOND_STAGE_VARIABLES(state, variables) {
    state.secondStageVariables = variables;
  },
  SET_ACTION(state, action) {
    state.sessionAction = action
  },
  SET_PROJECT_IDENTIFICATION(state, identification) {
    state.identification = identification
  },
  SET_INTEGRATION(state, action) {
    state.integration = action
  },
  SET_VISITOR(state) {
    let trackerid
    if(process.env.NODE_ENV==='development')
    {
     trackerid = 'UA-103793943-1';
    }
    else {
      trackerid = 'UA-103793943-3';
    }

      //state.visitor = new Analytics(trackerid).debug();
      state.visitor = new Analytics(trackerid, state.userEmail, {strictCidFormat: false}).debug();
    console.log("state.userEmail:"+state.userEmail);

      // state.cid = state.visitor.cid;
      // console.log("cid length", state.cid.length, "\n cid:", state.cid);
      //store.set("cid", state.cid);
  },


  PAGE_VIEW(state, pageProperties) {
    console.log("pageProperties", pageProperties);
    state.visitor.pageview(pageProperties.path, "http://devsupport.ai", pageProperties.title).send();
  },


  GA_EVENT(state, eventProperties) {
    console.log("eventProperties", eventProperties);
    state.visitor.event(eventProperties.category, eventProperties.action, eventProperties.label).send();
  },
  RUN_VARIABLE_VALIDATIONS(state, payload) {

    if (state.changes.length === 0) {
      payload.callback([]);
    } else {
      state.changes[0].runVariableValidations1(state.contextMap, payload.filteredValidations).then(function (result) {
        payload.callback(result);
      }).catch(function (failure) {
        payload.callback(failure);
      })
    }

  },
  DO_CHANGES(state, callback) {

    var resultMap = {}

    function doIndex(ith, doIndex) {
      if (state.changes.length == ith) {
        if (callback) {
          callback(resultMap);
        }
        return;
      }
      console.log("do change", ith);
      state.changes[ith].doChanges(state.contextMap).then(function () {
        resultMap[ith] = true
        doIndex(ith + 1, doIndex);
      }).catch(function (err) {
        console.log("change failed", arguments);
        state.changes[ith].error = err;
        resultMap[ith] = false
        doIndex(ith + 1, doIndex);
      });
    }

    doIndex(0, doIndex);

  },
  EVALUATE_TEMPLATES(state) {
    state.changes.map(function (liveChange) {
      liveChange.evaluateTemplates(state.contextMap)
    });
  },
  SET_REVIEW_RESULT_CONTENT(state, content) {
    state.reviewResultContent = content

  },
  SET_NEXT_INTEGRATIONS(state, content) {
    state.nextIntegrations = content

  },

  ADD_PROJECT(state, projectProperties) {
    window.console.log("this is the state object", state);
    //debugger
    if (!projectProperties.projectDir) {
      return
    }
    console.log("add project", projectProperties.projectDir);
    for (var i = 0; i < state.recentProjects.length; i++) {
      var rp = state.recentProjects[i];
      if (rp.location == projectProperties.projectDir) {
        state.currentProject = rp;
        if (projectProperties.identification) {
          rp.identification = projectProperties.identification;
        }
        state.recentProjects[i].lastAccess = new Date();
        if (state.recentProjects.length > 4) {
          state.recentProjects = state.recentProjects.slice(0, 4);
        }
        store.set("projects.recent", state.recentProjects);
        //store.delete("projects.recent");
        return
      }
    }

    let parts = projectProperties.projectDir.split("/");
    var name = parts[parts.length - 1];


    console.log("New project name", name);
    let newProject = {
      location: projectProperties.projectDir,
      lastAccess: new Date(),
      name: name,
      identification: projectProperties.identification,
    };
    state.recentProjects.unshift(newProject);
    state.currentProject = newProject;
    store.set("projects.recent", state.recentProjects);
    console.log("Updated recent projects");

  }

};

const actions = {
  setUserEmail({commit}, userEmail) {
    commit('SET_USER_EMAIL', userEmail);
  },
  setError({commit}, error) {
    commit('SET_ERROR', error);
  },
  setFaq({commit}, merchant) {
    commit('SET_FAQ', merchant);
  },
  setProjectDir({commit}, projectProperties) {
    console.log("set project dir", projectProperties.projectDir);
    commit('SET_PROJECT_DIR', projectProperties.projectDir);
    commit('ADD_PROJECT', projectProperties);
    commit("SET_ERROR", null);
  },
  setResults({commit}, results) {
    commit("SET_RESULTS", setResults)
  },
  runVariableValidations({commit}, payload) {
    // console.log("run commit", callback, arguments);
    commit("RUN_VARIABLE_VALIDATIONS", payload)
  },
  doChanges({commit}, callback) {
    commit("DO_CHANGES", callback)
  },
  setVariableValidations({commit}, validations) {
    commit("SET_VARIABLE_VALIDATIONS", validations)
  },
  evaluateTemplates({commit}) {
    commit("EVALUATE_TEMPLATES")
  },
  setSessionAction({commit}, action) {
    console.log("action set ", action);
    commit('SET_ACTION', action)
  },
  setIntegration({commit}, integration) {
    console.log("integation set ", integration);
    commit('SET_INTEGRATION', integration)
  },
  setLastStage({commit}, lastStage) {
    commit("SET_LAST_STAGE", lastStage)
  },
  setStage({commit}, stage) {
    commit("SET_STAGE", stage)
  },
  setChanges({commit}, changes) {
    commit("SET_CHANGES", changes);
  },
  setContextMap({commit}, contextMap) {
    commit("SET_CONTEXT_MAP", contextMap)
  },
  clearContextMap({commit}) {
    commit("CLEAR_CONTEXT_MAP")
  },
  setVariables({commit}, variables) {
    commit("SET_VARIABLES", variables);
  },
  setReviewResultContent({commit}, reviewResultsContent) {
    commit("SET_REVIEW_RESULT_CONTENT", reviewResultsContent)
  },
  setNextIntegrations({commit}, reviewResultsContent) {
    commit("SET_NEXT_INTEGRATIONS", reviewResultsContent)
  },
  setSecondStageVariables({commit}, variables) {
    commit("SET_SECOND_STAGE_VARIABLES", variables)
  },
  addProject({commit}, projectLocation) {
    console.log("Add project to recent projects", projectLocation);
    commit('ADD_PROJECT', {
      projectPath: projectLocation,
    });
  },
};

export default {
  state,
  mutations,
  actions,
};
