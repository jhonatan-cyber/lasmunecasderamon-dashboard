declare module 'swagger-ui-react' {
  import { Component } from 'react';
  
  interface SwaggerUIProps {
    url?: string;
    spec?: any;
    [key: string]: any;
  }
  
  export default class SwaggerUI extends Component<SwaggerUIProps> {}
} 