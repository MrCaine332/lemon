import React from "react"
import "./loading.scss"

const Loading = () => {
  return (
    <div className="loader__wrap">
      <div className="lds-roller">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  )
}

export default Loading
