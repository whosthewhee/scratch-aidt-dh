import PropTypes from "prop-types";
import React from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import ReactModal from "react-modal";
import VM from "scratch-vm";
import { injectIntl, intlShape } from "react-intl";

import ErrorBoundaryHOC from "../lib/error-boundary-hoc.jsx";
import { getIsError, getIsShowingProject } from "../reducers/project-state";
import {
    activateTab,
    BLOCKS_TAB_INDEX,
    COSTUMES_TAB_INDEX,
    SOUNDS_TAB_INDEX,
} from "../reducers/editor-tab";

import {
    closeCostumeLibrary,
    closeBackdropLibrary,
    closeTelemetryModal,
    openExtensionLibrary,
    closeDebugModal,
} from "../reducers/modals";

import FontLoaderHOC from "../lib/font-loader-hoc.jsx";
import LocalizationHOC from "../lib/localization-hoc.jsx";
import SBFileUploaderHOC from "../lib/sb-file-uploader-hoc.jsx";
import ProjectFetcherHOC from "../lib/project-fetcher-hoc.jsx";
import TitledHOC from "../lib/titled-hoc.jsx";
import ProjectSaverHOC from "../lib/project-saver-hoc.jsx";
import QueryParserHOC from "../lib/query-parser-hoc.jsx";
import storage from "../lib/storage";
import vmListenerHOC from "../lib/vm-listener-hoc.jsx";
import vmManagerHOC from "../lib/vm-manager-hoc.jsx";
import cloudManagerHOC from "../lib/cloud-manager-hoc.jsx";
import systemPreferencesHOC from "../lib/system-preferences-hoc.jsx";

import GUIComponent from "../components/gui/gui.jsx";
import { setIsScratchDesktop } from "../lib/isScratchDesktop.js";

const { RequestMetadata, setMetadata, unsetMetadata } = storage.scratchFetch;

const setProjectIdMetadata = (projectId) => {
    // If project ID is '0' or zero, it's not a real project ID. In that case, remove the project ID metadata.
    // Same if it's null undefined.
    if (projectId && projectId !== "0") {
        setMetadata(RequestMetadata.ProjectId, projectId);
    } else {
        unsetMetadata(RequestMetadata.ProjectId);
    }
};

class GUI extends React.Component {
    componentDidMount() {
        setIsScratchDesktop(this.props.isScratchDesktop);
        this.props.onStorageInit(storage);
        this.props.onVmInit(this.props.vm);
        setProjectIdMetadata(this.props.projectId);

        // 컴포넌트가 마운트될 때 메시지 이벤트 리스너 추가
        window.addEventListener("message", this.handleMessage);

        // 부모 페이지로 마운트된 프로젝트 상태 및 프로젝트 파일 전송
        this.sendProjectDataToParent("scratchProjectLoaded");
    }

    sendProjectDataToParent = async (projectType) => {
        try {
            const content = await this.props.vm.saveProjectSb3();
            window.parent.postMessage(
                {
                    type: projectType,
                    projectId: this.props.projectId,
                    isShowingProject: this.props.isShowingProject,
                    content: content,
                },
                "*"
            );
        } catch (error) {
            console.error("Error saving project:", error);
        }
    };

    componentWillUnmount() {
        // 컴포넌트가 언마운트될 때 메시지 이벤트 리스너 제거
        window.removeEventListener("message", this.handleMessage);
    }

    handleMessage = (event) => {
        //console.log("Received message:", event.data); // 메시지 수신 로그

        if (event.data.action === "importFile") {
            const file = event.data.file;
            //console.log("File received:", file); // 파일 수신 로그

            const reader = new FileReader();

            reader.onload = (e) => {
                const projectData = new Uint8Array(e.target.result);
                // console.log("Project data loaded:", projectData); // 프로젝트 데이터 로드 로그
                //console.log("Project data loaded"); // 프로젝트 데이터 로드 로그

                if (
                    this.props.vm &&
                    typeof this.props.vm.loadProject === "function"
                ) {
                    this.props.vm
                        .loadProject(projectData)
                        .then(() => {
                            //console.log("Project loaded successfully!");
                        })
                        .catch((error) => {
                            console.error("Error loading project:", error);
                        });
                } else {
                    console.error(
                        "VM or loadProject function is not available"
                    );
                }
            };

            reader.readAsArrayBuffer(file);
        }

        if (event.data.action === "exportFile") {
            //console.log("[스크래치] exportfile 요청 도착!!");
            // exportfile 요청이 오면 프로젝트 파일 전송

            // const sendProjectDataToParent = async (projectType) => {
            //     try {
            //         const content = await this.props.vm.saveProjectSb3();
            //         window.parent.postMessage(
            //             {
            //                 type: projectType,
            //                 projectId: this.props.projectId,
            //                 isShowingProject: this.props.isShowingProject,
            //                 content: content,
            //             },
            //             "*"
            //         );
            //     } catch (error) {
            //         console.error("Error saving project:", error);
            //     }
            // };

            // sendProjectDataToParent("scratchProjectExported");
            this.sendProjectDataToParent("scratchProjectExported");
        }
    };

    componentDidUpdate(prevProps) {
        if (this.props.projectId !== prevProps.projectId) {
            if (this.props.projectId !== null) {
                this.props.onUpdateProjectId(this.props.projectId);
            }
            setProjectIdMetadata(this.props.projectId);
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            // this only notifies container when a project changes from not yet loaded to loaded
            // At this time the project view in www doesn't need to know when a project is unloaded
            this.props.onProjectLoaded();
        }
        if (this.props.shouldStopProject && !prevProps.shouldStopProject) {
            this.props.vm.stopAll();
        }
    }
    render() {
        if (this.props.isError) {
            throw new Error(
                `Error in Scratch GUI [location=${window.location}]: ${this.props.error}`
            );
        }
        const {
            /* eslint-disable no-unused-vars */
            assetHost,
            cloudHost,
            error,
            isError,
            isScratchDesktop,
            isShowingProject,
            onProjectLoaded,
            onStorageInit,
            onUpdateProjectId,
            onVmInit,
            projectHost,
            projectId,
            /* eslint-enable no-unused-vars */
            children,
            fetchingProject,
            isLoading,
            loadingStateVisible,
            ...componentProps
        } = this.props;
        return (
            <GUIComponent
                loading={fetchingProject || isLoading || loadingStateVisible}
                {...componentProps}
            >
                {children}
            </GUIComponent>
        );
    }
}

GUI.propTypes = {
    assetHost: PropTypes.string,
    children: PropTypes.node,
    cloudHost: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    fetchingProject: PropTypes.bool,
    intl: intlShape,
    isError: PropTypes.bool,
    isLoading: PropTypes.bool,
    isScratchDesktop: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loadingStateVisible: PropTypes.bool,
    onProjectLoaded: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onStorageInit: PropTypes.func,
    onUpdateProjectId: PropTypes.func,
    onVmInit: PropTypes.func,
    projectHost: PropTypes.string,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    shouldStopProject: PropTypes.bool,
    telemetryModalVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired,
};

GUI.defaultProps = {
    isScratchDesktop: false,
    isTotallyNormal: false,
    onStorageInit: (storageInstance) =>
        storageInstance.addOfficialScratchWebStores(),
    onProjectLoaded: () => {},
    onUpdateProjectId: () => {},
    onVmInit: (/* vm */) => {},
};

const mapStateToProps = (state) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    return {
        activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
        alertsVisible: state.scratchGui.alerts.visible,
        backdropLibraryVisible: state.scratchGui.modals.backdropLibrary,
        blocksTabVisible:
            state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
        cardsVisible: state.scratchGui.cards.visible,
        connectionModalVisible: state.scratchGui.modals.connectionModal,
        costumeLibraryVisible: state.scratchGui.modals.costumeLibrary,
        costumesTabVisible:
            state.scratchGui.editorTab.activeTabIndex === COSTUMES_TAB_INDEX,
        debugModalVisible: state.scratchGui.modals.debugModal,
        error: state.scratchGui.projectState.error,
        isError: getIsError(loadingState),
        isFullScreen: state.scratchGui.mode.isFullScreen,
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRtl: state.locales.isRtl,
        isShowingProject: getIsShowingProject(loadingState),
        loadingStateVisible: state.scratchGui.modals.loadingProject,
        projectId: state.scratchGui.projectState.projectId,
        soundsTabVisible:
            state.scratchGui.editorTab.activeTabIndex === SOUNDS_TAB_INDEX,
        targetIsStage:
            state.scratchGui.targets.stage &&
            state.scratchGui.targets.stage.id ===
                state.scratchGui.targets.editingTarget,
        telemetryModalVisible: state.scratchGui.modals.telemetryModal,
        tipsLibraryVisible: state.scratchGui.modals.tipsLibrary,
        vm: state.scratchGui.vm,
    };
};

const mapDispatchToProps = (dispatch) => ({
    onExtensionButtonClick: () => dispatch(openExtensionLibrary()),
    onActivateTab: (tab) => dispatch(activateTab(tab)),
    onActivateCostumesTab: () => dispatch(activateTab(COSTUMES_TAB_INDEX)),
    onActivateSoundsTab: () => dispatch(activateTab(SOUNDS_TAB_INDEX)),
    onRequestCloseBackdropLibrary: () => dispatch(closeBackdropLibrary()),
    onRequestCloseCostumeLibrary: () => dispatch(closeCostumeLibrary()),
    onRequestCloseDebugModal: () => dispatch(closeDebugModal()),
    onRequestCloseTelemetryModal: () => dispatch(closeTelemetryModal()),
});

const ConnectedGUI = injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(GUI)
);

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedGui = compose(
    LocalizationHOC,
    ErrorBoundaryHOC("Top Level App"),
    FontLoaderHOC,
    QueryParserHOC,
    ProjectFetcherHOC,
    TitledHOC,
    ProjectSaverHOC,
    vmListenerHOC,
    vmManagerHOC,
    SBFileUploaderHOC,
    cloudManagerHOC,
    systemPreferencesHOC
)(ConnectedGUI);

WrappedGui.setAppElement = ReactModal.setAppElement;
export default WrappedGui;
