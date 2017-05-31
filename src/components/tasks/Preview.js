import React from 'react';
import { Link } from 'react-router'
/**
 * @see http://react-component.github.io/tooltip/
 */
import ReactTooltip from 'rc-tooltip'

export default class Preview extends React.Component {


    constructor(props) {
        super(props);
    }

    /**
     * [_handleExpand new-window expand handler]
     */
    _handleExpand(id) {
        this.props.setPreviewExpanded({
            isScreenOpen: true,
            id: id
        })
    }

    render() {
        const {id, src} = this.props
        return (
            <div className="section__preview-black">
                <ReactTooltip placement="bottomRight" trigger={['hover']} overlay={<p>Preview Window</p>} mouseEnterDelay={1} align={{
                offset: [0, 10],
            }} arrowContent={<div className="rc-tooltip-arrow-inner"></div>}>
                    <span className="button__expand icon-new-window" onClick={this._handleExpand.bind(this, id)} onKeyDown={(event) => {
                event.keyCode === 13 && this._handleExpand.call(this)
            }} role="button" aria-label="Open Detailed Preview Window" tabIndex="0"></span>
                </ReactTooltip>
                <img src={src ? src : 'error'} alt="Task Preview" ref={img => this.img = img} onError={
            () => this.img.src = 'http://golem.network/img/golem.png'}/>
            </div>
        );
    }
}
