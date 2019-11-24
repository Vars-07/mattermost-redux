// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';
import {FileTypes, PostTypes, UserTypes} from 'action_types';
import {GenericAction} from 'types/actions';
import {Post} from 'types/posts';
import {FileInfo} from 'types/files';
import {Dictionary} from 'types/utilities';

export function files(state: Dictionary<FileInfo> = {}, action: GenericAction) {
    switch (action.type) {
    case FileTypes.RECEIVED_UPLOAD_FILES:
    case FileTypes.RECEIVED_FILES_FOR_POST: {
        const filesById = action.data.reduce((filesMap: any, file: any) => {
            return {...filesMap,
                [file.id]: file,
            };
        }, {} as any);
        return {...state,
            ...filesById,
        };
    }

    case FileTypes.UPDATE_FILES_FOR_POST: {
        // Triggered when replacing a pending uploaded file once it was uploaded
        const data = action.data;
        const nextState: Dictionary<FileInfo> = {
            ...state,
            [data.id]: {
                ...state[data.clientId],
                id: data.id,
                post_id: data.postId,
                failed: false,
            },
        };
        Reflect.deleteProperty(nextState, data.clientId);
        return nextState;
    }

    case FileTypes.UPLOAD_FILES_FAILURE: {
        // Mark pending uploads as failed
        const clientIds: Array<string> = action.clientIds;
        const failed: Dictionary<FileInfo> = {};
        clientIds.forEach((id: string) => {
            if (state[id]) {
                failed[id] = {
                    ...state[id],
                    failed: true,
                };
            }
        });

        if (Object.keys(failed).length) {
            return {
                ...state,
                ...failed,
            };
        }

        return state;
    }

    case PostTypes.RECEIVED_NEW_POST:
    case PostTypes.RECEIVED_POST: {
        const post = action.data;

        return storeFilesForPost(state, post);
    }

    case PostTypes.RECEIVED_POSTS: {
        const posts = Object.values(action.data.posts);

        return posts.reduce(storeFilesForPost, state);
    }

    case PostTypes.POST_DELETED:
    case PostTypes.POST_REMOVED: {
        if (action.data && action.data.file_ids && action.data.file_ids.length) {
            const nextState = {...state};
            const fileIds = action.data.file_ids as string[];
            fileIds.forEach((id) => {
                Reflect.deleteProperty(nextState, id);
            });

            return nextState;
        }

        return state;
    }

    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function storeFilesForPost(state: Dictionary<FileInfo>, post: Post) {
    if (!post.metadata || !post.metadata.files) {
        return state;
    }

    return post.metadata.files.reduce((nextState, file) => {
        if (nextState[file.id]) {
            // File is already in the store
            return nextState;
        }

        return {
            ...nextState,
            [file.id]: file,
        };
    }, state);
}

export function fileIdsByPostId(state: Dictionary<Array<string>> = {}, action: GenericAction) {
    switch (action.type) {
    case FileTypes.RECEIVED_FILES_FOR_POST: {
        const {data, postId} = action;
        const filesIdsForPost = data.map((file: FileInfo) => file.id);
        return {...state,
            [postId as string]: filesIdsForPost,
        };
    }

    case FileTypes.UPDATE_FILES_FOR_POST: {
        // Triggered when replacing a pending uploaded file once it was uploaded
        const data = action.data;
        const nextState: Dictionary<Array<string>> = {
            ...state,
            [data.postId as string]: [data.id],
        };
        Reflect.deleteProperty(nextState, data.pendingPostId);
        return nextState;
    }

    case PostTypes.RECEIVED_NEW_POST:
    case PostTypes.RECEIVED_POST: {
        const post = action.data;

        return storeFilesIdsForPost(state, post);
    }

    case PostTypes.RECEIVED_POSTS: {
        const posts = Object.values(action.data.posts);

        return posts.reduce(storeFilesIdsForPost, state);
    }

    case PostTypes.POST_DELETED:
    case PostTypes.POST_REMOVED: {
        if (action.data) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, action.data.id);
            return nextState;
        }

        return state;
    }

    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function storeFilesIdsForPost(state: Dictionary<string[]>, post: Post) {
    if (!post.metadata || !post.metadata.files) {
        return state;
    }

    return {
        ...state,
        [post.id]: post.metadata.files ? post.metadata.files.map((file) => file.id) : [],
    };
}

function filePublicLink(state: {link: string} = {link: ''}, action: GenericAction) {
    switch (action.type) {
    case FileTypes.RECEIVED_FILE_PUBLIC_LINK: {
        return action.data;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {link: ''};

    default:
        return state;
    }
}

export default combineReducers({
    files,
    fileIdsByPostId,
    filePublicLink,
});
