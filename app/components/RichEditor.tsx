"use client"

import "../editor.css"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"

import Image from "@tiptap/extension-image"

import TextAlign from "@tiptap/extension-text-align"

import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"

import { MathExtension } from "@aarkue/tiptap-math-extension"

import "katex/dist/katex.min.css"

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function RichEditor({
  value,
  onChange,
}: Props) {

  const editor = useEditor({

    extensions: [

      StarterKit,

      Table.configure({
        resizable: true,
      }),

      TableRow,
      TableHeader,
      TableCell,

      Image.configure({
        inline: false,
        allowBase64: true,
      }),

      TextAlign.configure({
        types: [
          "heading",
          "paragraph",
        ],
      }),

      Subscript,
      Superscript,

      MathExtension.configure({
        evaluation: false,
      }),
    ],

    content: value,

    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[350px] p-5 focus:outline-none",
      },
    },

    onUpdate({ editor }) {

      onChange(
        editor.getHTML()
      )
    },
  })

  if (!editor) return null

  return (

    <div className="
      border
      border-gray-200
      rounded-2xl
      overflow-hidden
      bg-white
      shadow-sm
    ">

      {/* TOOLBAR */}
      <div className="
        flex
        flex-wrap
        gap-2
        p-3
        border-b
        bg-slate-50
      ">

        {/* BOLD */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Bold
        </button>

        {/* ITALIC */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Italic
        </button>

        {/* SUBSCRIPT */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleSubscript()
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Xₚ
        </button>

        {/* SUPERSCRIPT */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleSuperscript()
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          X²
        </button>

        {/* TABLE */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({
                rows: 3,
                cols: 5,
                withHeaderRow: true,
              })
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Table
        </button>

        {/* RUMUS */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent(
                "\\( \\frac{V_p}{V_s} = \\frac{N_p}{N_s} \\)"
              )
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Rumus
        </button>

        {/* CENTER */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign("center")
              .run()
          }
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Center
        </button>

        {/* IMAGE */}
        <button
          type="button"
          onClick={() => {

            const url =
              prompt(
                "Masukkan URL gambar"
              )

            if (!url) return

            editor
              .chain()
              .focus()
              .setImage({
                src: url,
              })
              .run()
          }}
          className="
            px-3
            py-2
            bg-white
            border
            rounded-xl
            text-sm
            font-semibold
            hover:bg-blue-50
          "
        >
          Gambar
        </button>

      </div>

      {/* EDITOR */}
      <EditorContent
        editor={editor}
      />

    </div>
  )
}