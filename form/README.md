# react-kit-form

## Installation

You can install react-kit-form by

```bash
  yarn add @bhoos/react-kit-form
```

## Usage/Example

### A simple register user form .

Let's say we want to add a signup form on our app. We have 3 input fields : username, contactNumber and contactNumberVerificationCode.

```tsx
const App = () => {

  const formState = {
    username:{
      parser: new TextParser().required();
    },
    contactNumber : {
      parser: new IntegerParser().required().minLength(10).maxLength(10);
    },
    contactNumberVerificationCode:{
      parser: new IntegerParser().required().minLength(6);
    }
  }

  const initialState = {};

  const controller = useFormController(formState,initialState);

  const handleSignup = async () => {
    const formValues = controller.getState();
    await fetch("https://fakeRegistration/registerUser",{
      method:'POST',
      body:JSON.stringify(formValues),
      headers:{
        'Content-Type':'application/json'
      }
    })
  }

  return (
    <Form controller={controller}>
      <FormTextInput name="username" label="Username" />
      <FormTextInput name="contactNumber" label="Contact number" />
      <FormTextInput name="contactNumberVerificationCode" label="Verification code" />
      <Button
      onPress={handleSignup}
      title="Sign up"
      />
    </Form>
  )

}

const FormTextInput = ({name,label}:{name:string,label:string}) => {
  const [value,onChange] = useFormInput(name);
  const error = useInputError(name);
  return (
    <View>
      <Text>{label}</Text>
      <TextInput value={value} onChangeText={onChange} />
      {
        error && <Text>{error}</Text>
      }
    </View>
    )
}

```

We define the form definitions in `formState` . We attach a parser to each field which validates the input and checks the grammar of the input.

`TextParser` comes with methods like
`required` `minLength` `maxLength` which validates the input.

We can also define the `initialState` of the form by passing the initial values.

Provide `formState` and `initalState` to useFormController hook and pass the controller to `Form` component.

Now we add text input components inside `Form` component . We declare our input components as per our needs and style it accordingly .

Our example input component `FormTextInput` component uses `useFormInput` and `useInputError` hook .

`useFormInput` hook provides the value and setter function to update the input field from the name parameter we provide to it. It gives us the ability to connect any kind input of component to `react-form-kit` . We can use it to build a group of reusable inputs that fit our needs.

`useInputError` hook listens to the error for the input field and sets the error and returns it . We can display the error on such cases.

`handleSignup` function handles the `Sign up` action in the example . We use `controller.getState()` to get all the current form value states or we can get a particular value of the input, for example username by `controller.getState().username` .

## Form validations

We have diffrent parsers available in `src/parsers` folder to use as per our needs on different type of input fields .

`BooleanParser`

`DateParser`

`IntegerParser`

`DecimalParser`

`TextParser`

You can create your own parsers as per your requirements.

Parser checks the grammar of the input. They contribute towards validations.

`useInputError` hook returns error based on the parser attached to the form definition .

## Hooks

### useFormController()

`useFormController()` hook returns an instance of FormController which provides us with methods like `getState()` , `get()` , `getInput()` , `set()`,`setInput()` and many more .

### useFormInput()

`useFormInput()` hook returns value and setValue function like `useState()` hook . Under the hood the hook initializes the state using `controller.getInput('inputfieldname')` and updates the value using `controller.setInput('inputfieldname',value)`

### useFormValue()

`useFormValue()` hook returns the current value of the input field name provided .

### useInputError()

`useInputError()` hook returns the error(if there is error) associated with value of the input field name provided .
