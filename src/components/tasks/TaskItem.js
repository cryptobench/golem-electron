import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import map from 'lodash/fp/map';
import isEqual from 'lodash/isEqual';
import Tooltip from '@tippy.js/react';
import { Spring, config } from 'react-spring/renderprops.cjs';

import { ETH_DENOM } from '../../constants/variables';
import { convertSecsToHMS, timeStampToHR } from './../../utils/time';
import { taskStatus } from './../../constants/statusDicts';

import * as Actions from '../../actions';

import Preview from './Preview';
import Details from './details';
import ConditionalRender from '../hoc/ConditionalRender';
const { ipcRenderer, clipboard } = window.electron;

const mapStateToProps = state => ({
  psId: state.preview.ps.id,
  nodeNumbers: state.details.nodeNumber,
  isDeveloperMode: state.input.developerMode,
  isMainNet: state.info.isMainNet
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(Actions, dispatch)
});

const taskType = Object.freeze({
  BLENDER: 'Blender',
  BLENDER_NVGPU: 'Blender_NVGPU'
});

export class TaskItem extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      toggledList: [],
      isDataCopied: false
    };

    this.copyTimeout = false;
  }

  componentWillUpdate(nextProps, nextState) {
    const { actions, item } = nextProps;

    if (item.status == taskStatus.COMPUTING && !this.liveSubList) {
      this.liveSubList = setInterval(this._interval(actions, item), 5000);
    }
  }

  componentWillUnmount() {
    this.liveSubList && clearInterval(this.liveSubList);
    this.copyTimeout && clearTimeout(this.copyTimeout);
  }

  _interval = (actions, item) => {
    actions.fetchHealthyNodeNumber(item.id);
    return this._interval.bind(null, actions, item);
  };

  _toggle(id, evt, toggledAttribute) {
    const prevList = this.state.toggledList;
    const prevToggle = this.state.toggledList[id]
      ? this.state.toggledList[id][toggledAttribute]
      : false;

    if (prevList[id]) {
      prevList[id] = map(prevList[id], item => false);
    } else {
      prevList[id] = {};
    }

    prevList[id][toggledAttribute] = !prevToggle;

    this.setState({
      toggledList: prevList
    });
  }

  _togglePreview({ id }, evt) {
    this._toggle(id, evt, 'preview');
  }

  _toggleDetail({ id }, evt) {
    this._toggle(id, evt, 'detail');
  }

  _openLogs = path => ipcRenderer.send('open-file', path);

  /**
   * [_fetchStatus func. populate status of the task]
   * @param  {Object}     item    [Task item]
   * @return {DOM}                [Element of the status]
   */
  _fetchStatus = item => {
    const { options } = item;
    const { nodeNumbers } = this.props;
    switch (item.status) {
      case taskStatus.CREATING:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--preparing">Creating the task... </span>
          </div>
        );

      case taskStatus.ERRORCREATING:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--failure">
              {item?.status_message || 'Error creating task'}
            </span>
          </div>
        );

      case taskStatus.ABORTED:
        return (
          <div>
            <span>
              Task time:{' '}
              {timeStampToHR(item.last_updated - item.time_started, true)}
            </span>
            <span className="bumper" />
            <span className="duration--aborted">Aborted: </span>
            <span>{timeStampToHR(item.last_updated)}</span>
          </div>
        );

      case taskStatus.TIMEOUT:
        return (
          <div>
            <span>
              Task time:{' '}
              {timeStampToHR(item.last_updated - item.time_started, true)}
            </span>
            <span className="bumper" />
            <span className="duration--timeout">Timed out: </span>
            <span>{timeStampToHR(item.last_updated)}</span>
          </div>
        );

      case taskStatus.NOTREADY:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--preparing">
              Preparing for computation...{' '}
            </span>
          </div>
        );

      case taskStatus.WAITING:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--preparing">
              Waiting for computation...{' '}
            </span>
          </div>
        );

      case taskStatus.DEPOSIT:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--preparing">
              Creating the deposit...{' '}
            </span>
          </div>
        );

      case taskStatus.RESTART:
        return (
          <div>
            <span>
              Task time:{' '}
              {timeStampToHR(item.last_updated - item.time_started, true)}
            </span>
            <span className="bumper" />
            <span className="duration--restarted">Restarted</span>
          </div>
        );

      case taskStatus.COMPUTING:
        return (
          <div>
            <span>
              Duration:{' '}
              {convertSecsToHMS(new Date() / 1000 - item.time_started)}
            </span>
            <span className="bumper" />
            <span className="duration--computing">Computing... </span>
            <span className="bumper" />
            <span>{nodeNumbers && nodeNumbers[item.id]} Nodes</span>
          </div>
        );

      default:
        return (
          <div>
            <span>
              Task time:{' '}
              {timeStampToHR(item.last_updated - item.time_started, true)}
            </span>
            <span className="bumper" />
            <span className="duration--finished">Finished: </span>
            <span>{timeStampToHR(item.last_updated)}</span>
          </div>
        );
    }
  };

  _fetchCost(item) {
    const fixedTo = 4;
    const { isMainNet } = this.props;
    return (
      <span>
        {(item.cost && (item.cost / ETH_DENOM).toFixed(fixedTo)) ||
          (item.estimated_cost / ETH_DENOM).toFixed(fixedTo)}
        {isMainNet ? ' ' : ' t'}
        GNT/
        {(item.fee && (item.fee / ETH_DENOM).toFixed(fixedTo)) ||
          (item.estimated_fee / ETH_DENOM).toFixed(fixedTo)}
        {isMainNet ? ' ' : ' t'}
        ETH
      </span>
    );
  }

  _copyField = item => {
    if (this.copyTimeout && this.state.isDataCopied) return;

    if (item) {
      clipboard.writeText(item);

      this.setState(prevData => ({
        isDataCopied: !prevData.isDataCopied
      }));
      this.copyTimeout = setTimeout(() => {
        this.setState(prevData => ({
          isDataCopied: !prevData.isDataCopied
        }));
        clearTimeout(this.copyTimeout);
        this.copyTimeout = null;
      }, 2000);
    }
  };

  render() {
    const {
      item,
      index,
      _handleRowClick,
      _handleRestartModal,
      _handleRestartSubtasksModal,
      _handleDeleteModal,
      psId,
      isDeveloperMode
    } = this.props;
    const { toggledList, isDataCopied } = this.state;
    const { options } = item;
    const isSupportedTaskType = Object.values(taskType).indexOf(item.type) >= 0;
    return (
      <Spring
        from={{
          progress: 0
        }}
        to={{
          progress: item.progress
        }}
        config={{
          tension: 180,
          friction: 10
        }}
        role="listItem"
        tabIndex="-1">
        {value => (
          <div className="wrapper-task-item">
            <div
              className="task-item"
              style={{
                background:
                  item.progress < 1
                    ? `linear-gradient(90deg, #E3F3FF ${value.progress *
                        100}%, transparent ${value.progress * 100}%)`
                    : 'transparent'
              }}
              onClick={e => _handleRowClick(e, item, index)}>
              <div
                className="info__task-item"
                tabIndex="0"
                aria-label="Task Preview">
                <div>
                  <span
                    className={`task-icon icon-${
                      isSupportedTaskType
                        ? item.type.toLowerCase()
                        : 'default-task'
                    } ${
                      item.concent_enabled
                        ? 'icon-blender_concent'
                        : ''
                    }`}>
                    <span className="path1" />
                    <span className="path2" />
                    <span className="path3" />
                    <span className="path4" />
                  </span>
                </div>
                <div className="task-item__main">
                  <h4>
                    {item.name}
                    {isDeveloperMode && (
                      <Tooltip
                        content={
                          <p>
                            {isDataCopied
                              ? 'Copied successfully!'
                              : 'Copy task ID'}
                          </p>
                        }
                        placement="right"
                        trigger="mouseenter"
                        size="small"
                        hideOnClick={false}>
                        <span
                          className="icon-copy"
                          onClick={this._copyField.bind(null, item.id)}
                        />
                      </Tooltip>
                    )}
                  </h4>
                  <div className="duration">
                    {this._fetchStatus(item)}
                    <div className="info__task">
                      <ConditionalRender showIf={isSupportedTaskType}>
                        <span>
                          Frames: {(options && options.frame_count) || 0}
                        </span>
                        <span className="bumper" />
                        <span>
                          {' '}
                          Resolution:{' '}
                          {(options &&
                            options.resolution &&
                            options.resolution.join('x')) ||
                            0}
                        </span>
                        <span className="bumper" />
                      </ConditionalRender>
                      <span>Cost: {this._fetchCost(item)}</span>
                      <div>
                        <span>Subtasks: {item.subtasks_count || 0}</span>
                        <span className="bumper" />
                        <span> Task timeout: {item.timeout}</span>
                        <span className="bumper" />
                        <span> Subtask timeout: {item.subtask_timeout}</span>
                      </div>
                    </div>
                    <ConditionalRender showIf={isSupportedTaskType}>
                      <div
                        className="control-panel__task"
                        ref={node => (this.controlPanelRef = node)}>
                        <Tooltip
                          content={<p>Preview</p>}
                          placement="bottom"
                          trigger="mouseenter"
                          size="small">
                          <span
                            className="icon-preview"
                            tabIndex="0"
                            aria-label="Preview"
                            onClick={this._togglePreview.bind(this, item)}>
                            <span className="info-label">Preview</span>
                          </span>
                        </Tooltip>
                        <Tooltip
                          content={<p>Task Details</p>}
                          placement="bottom"
                          trigger="mouseenter"
                          className="task-details-icon"
                          size="small">
                          <span
                            className="icon-details"
                            tabIndex="0"
                            aria-label="Task Details"
                            onClick={this._toggleDetail.bind(this, item)}>
                            <span className="info-label">Details</span>
                          </span>
                        </Tooltip>
                        <Tooltip
                          content={<p>Restart</p>}
                          placement="bottom"
                          trigger="mouseenter"
                          size="small">
                          <span
                            className="icon-refresh"
                            tabIndex="0"
                            aria-label="Restart Task"
                            onClick={
                              item.status !== taskStatus.RESTART
                                ? _handleRestartModal
                                : undefined
                            }
                            disabled={!(item.status !== taskStatus.RESTART)}>
                            <span className="info-label">Restart</span>
                          </span>
                        </Tooltip>
                        <Tooltip
                          content={<p>Output</p>}
                          placement="bottom"
                          trigger="mouseenter"
                          size="small">
                          <span
                            className="icon-folder"
                            tabIndex="0"
                            aria-label="Open Delete Task Popup"
                            onClick={this._openLogs.bind(
                              null,
                              options.output_path
                            )}
                            disabled={!options.output_path}>
                            <span className="info-label">Output</span>
                          </span>
                        </Tooltip>
                        <Tooltip
                          content={<p>Delete</p>}
                          placement="bottom"
                          trigger="mouseenter"
                          size="small">
                          <span
                            className="icon-delete"
                            tabIndex="0"
                            aria-label="Open Delete Task Popup"
                            onClick={_handleDeleteModal}>
                            <span className="info-label">Delete</span>
                          </span>
                        </Tooltip>
                      </div>
                    </ConditionalRender>
                    <ConditionalRender showIf={!isSupportedTaskType}>
                      <div className="info-task-unsupported">
                        <span>
                          Functionality for task type: {item.type} is available
                          from CLI.
                        </span>
                      </div>
                    </ConditionalRender>
                  </div>
                </div>
              </div>
            </div>
            <ConditionalRender
              showIf={
                item.id === psId &&
                toggledList[psId] &&
                toggledList[psId].preview
              }>
              <Preview
                id={item.id}
                src={item.preview}
                progress={item.progress}
              />
            </ConditionalRender>
            <ConditionalRender
              showIf={
                item.id === psId &&
                toggledList[psId] &&
                toggledList[psId].detail
              }>
              <Details
                item={item}
                updateIf={isTaskRunning(item)}
                restartSubtasksModalHandler={_handleRestartSubtasksModal}
              />
            </ConditionalRender>
          </div>
        )}
      </Spring>
    );
  }
}

function isTaskRunning(item) {
  return !(
    item.status === taskStatus.RESTART ||
    item.status === taskStatus.TIMEOUT ||
    item.status === taskStatus.FINISHED ||
    item.status === taskStatus.ABORTED ||
    item.status === taskStatus.ERRORCREATING
  );
}

function areEqual(prevProps, nextProps) {
  return (
    !isTaskRunning(nextProps.item) &&
    isEqual(prevProps.item, nextProps.item) && 
    isEqual(prevProps.psId, nextProps.psId)
  );
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(React.memo(TaskItem, areEqual));

const RefLink = forwardRef((props, ref) => {
  return (
    <Link
      innerRef={ref}
      to={`/task/${props.item && props.item.id}`}
      tabIndex="0"
      aria-label="Task Details">
      <span className="icon-details" />
    </Link>
  );
});
