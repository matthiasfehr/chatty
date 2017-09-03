import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Button,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import { NavigationActions } from 'react-navigation';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import ImagePicker from 'react-native-image-crop-picker';
import { ReactNativeFile } from 'apollo-upload-client';

import { USER_QUERY } from '../graphql/user.query';
import CREATE_GROUP_MUTATION from '../graphql/create-group.mutation';
import SelectedUserList from '../components/selected-user-list.component';

const goToNewGroup = group => NavigationActions.reset({
    index: 1,
    actions: [
        NavigationActions.navigate({ routeName: 'Main' }),
        NavigationActions.navigate({ routeName: 'Messages', params: { groupId: group.id, title: group.name, icon: group.icon } }),
    ],
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    detailsContainer: {
        padding: 20,
        flexDirection: 'row',
    },
    imageContainer: {
        paddingRight: 20,
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    input: {
        color: 'black',
        height: 32,
    },
    inputBorder: {
        borderColor: '#dbdbdb',
        borderBottomWidth: 1,
        borderTopWidth: 1,
        paddingVertical: 8,
    },
    inputInstructions: {
        paddingTop: 6,
        color: '#777',
        fontSize: 12,
    },
    groupImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    selected: {
        flexDirection: 'row',
    },
    loading: {
        justifyContent: 'center',
        flex: 1,
    },
    navIcon: {
        color: 'blue',
        fontSize: 18,
        paddingTop: 2,
    },
    participants: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        backgroundColor: '#dbdbdb',
        color: '#777',
    },
});

class FinalizeGroup extends Component {
    static navigationOptions = ({ navigation }) => {
        const { state } = navigation;
        const isReady = state.params && state.params.mode === 'ready';
        return {
            title: 'New Group',
            headerRight: (
                isReady ? <Button
                    title="Create"
                    onPress={state.params.create}
                /> : undefined
            ),
        };
    };

    constructor(props) {
        super(props);

        const { selected } = props.navigation.state.params;

        this.state = {
            selected,
        };

        this.create = this.create.bind(this);
        this.pop = this.pop.bind(this);
        this.remove = this.remove.bind(this);
        this.getIcon = this.getIcon.bind(this);
    }

    componentDidMount() {
        this.refreshNavigation(this.state.selected.length && this.state.name);
    }

    componentWillUpdate(nextProps, nextState) {
        if ((nextState.selected.length && nextState.name) !==
            (this.state.selected.length && this.state.name)) {
            this.refreshNavigation(nextState.selected.length && nextState.name);
        }
    }

    getIcon() {
        const self = this;
        ImagePicker.openPicker({
            width: 100,
            height: 100,
            cropping: true,
            cropperCircleOverlay: true,
        }).then(file => {
            console.log(file);
            const icon = new ReactNativeFile({
                name: 'avatar',
                type: file.mime,
                size: file.size,
                path: file.path,
                uri: file.path,
            });
            self.setState({ icon });
        });
    }

    pop() {
        this.props.navigation.goBack();
    }

    remove(user) {
        const index = this.state.selected.indexOf(user);
        if (~index) {
            const selected = update(this.state.selected, { $splice: [[index, 1]] });
            this.setState({
                selected,
            });
        }
    }

    create() {
        const { createGroup } = this.props;

        createGroup({
            name: this.state.name,
            userIds: _.map(this.state.selected, 'id'),
            icon: this.state.icon,
        }).then((res) => {
            this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
        }).catch((error) => {
            Alert.alert(
                'Error Creating New Group',
                error.message,
                [
                    { text: 'OK', onPress: () => {} },
                ],
            );
        });
    }

    refreshNavigation(ready) {
        const { navigation } = this.props;
        navigation.setParams({
            mode: ready ? 'ready' : undefined,
            create: this.create,
        });
    }

    render() {
        const { friendCount } = this.props.navigation.state.params;
        const { icon } = this.state;

        return (
            <View style={styles.container}>
                <View style={styles.detailsContainer}>
                    <TouchableOpacity
                        onPress={this.getIcon}
                        style={styles.imageContainer}
                    >
                        <Image
                            style={styles.groupImage}
                            source={icon || { uri: 'https://facebook.github.io/react/img/logo_og.png' }}
                        />
                        <Text>edit</Text>
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <View style={styles.inputBorder}>
                            <TextInput
                                autoFocus
                                onChangeText={name => this.setState({ name })}
                                placeholder="Group Subject"
                                style={styles.input}
                            />
                        </View>
                        <Text style={styles.inputInstructions}>
                            {'Please provide a group subject and optional group icon'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.participants}>
                    {`participants: ${this.state.selected.length} of ${friendCount}`.toUpperCase()}
                </Text>
                <View style={styles.selected}>
                    {this.state.selected.length ?
                        <SelectedUserList
                            data={this.state.selected}
                            remove={this.remove}
                        /> : undefined}
                </View>
            </View>
        );
    }
}

FinalizeGroup.propTypes = {
    createGroup: PropTypes.func.isRequired,
    navigation: PropTypes.shape({
        dispatch: PropTypes.func,
        goBack: PropTypes.func,
        state: PropTypes.shape({
            params: PropTypes.shape({
                friendCount: PropTypes.number.isRequired,
            }),
        }),
    }),
};

const createGroupMutation = graphql(CREATE_GROUP_MUTATION, {
    props: ({ ownProps, mutate }) => ({
        createGroup: group =>
            mutate({
                variables: { group },
                update: (store, { data: { createGroup } }) => {
                    // Read the data from our cache for this query.
                    const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } });

                    // Add our message from the mutation to the end.
                    data.user.groups.push(createGroup);

                    // Write our data back to the cache.
                    store.writeQuery({
                        query: USER_QUERY,
                        variables: { id: 1 },
                        data,
                    });
                },
            }),
    }),
});

const userQuery = graphql(USER_QUERY, {
    options: ownProps => ({
        variables: {
            id: ownProps.navigation.state.params.userId,
        },
    }),
    props: ({ data: { loading, user } }) => ({
        loading, user,
    }),
});

const mapStateToProps = ({ auth }) => ({
    auth,
});

export default compose(
    connect(mapStateToProps),
    userQuery,
    createGroupMutation,
)(FinalizeGroup);